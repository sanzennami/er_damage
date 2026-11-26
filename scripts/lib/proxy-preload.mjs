// scripts/lib/proxy-preload.mjs —— 禁用全局连接池复用 + 自动关闭空闲隧道防挂起
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import zlib from 'node:zlib';

const proxyRaw = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || '';
const origFetch = globalThis.fetch;

if (proxyRaw) {
  const proxyUrl = new URL(proxyRaw);
  console.log(`[Proxy] 全局 Node fetch 已挂载代理隧道 -> ${proxyUrl.host}`);

  function decompressBuffer(buf, encoding) {
    if (!buf.length || !encoding) return buf;
    const enc = String(encoding).toLowerCase();
    if (enc.includes('br')) return zlib.brotliDecompressSync(buf);
    if (enc.includes('gzip')) return zlib.gunzipSync(buf);
    if (enc.includes('deflate')) return zlib.inflateSync(buf);
    return buf;
  }

  function requestViaProxy(targetInput, init = {}, redirectsLeft = 5) {
    const rawStr = typeof targetInput === 'string' && targetInput.startsWith('//')
      ? `https:${targetInput}`
      : String(targetInput instanceof URL ? targetInput.href : (targetInput?.url || targetInput));
    const target = new URL(rawStr);
    const method = (init.method || 'GET').toUpperCase();
    const reqHeaders = {
      'user-agent': 'Mozilla/5.0',
      'accept-encoding': 'gzip, deflate, br',
      ...(init.headers instanceof Headers ? Object.fromEntries(init.headers.entries()) : (init.headers || {})),
      host: target.host,
      connection: 'close'
    };

    return new Promise((resolve, reject) => {
      let settled = false;
      let activeSocket = null;

      const finish = (fn, val) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        fn(val);
      };

      const timeoutMs = Number(process.env.ER_PROXY_TIMEOUT_MS) || 25000;
      const hardTimer = setTimeout(() => {
        if (activeSocket) activeSocket.destroy();
        finish(reject, new Error(`Proxy request timeout (${Math.round(timeoutMs / 1000)}s): ${target.href}`));
      }, timeoutMs);

      const handleIncoming = (res) => {
        const code = res.statusCode || 200;
        if ([301, 302, 303, 307, 308].includes(code) && res.headers.location && redirectsLeft > 0) {
          res.resume();
          if (activeSocket) activeSocket.destroy();
          const nextUrl = new URL(res.headers.location, target);
          const nextInit = code === 303 ? { ...init, method: 'GET', body: undefined } : init;
          finish(resolve, requestViaProxy(nextUrl.href, nextInit, redirectsLeft - 1));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          if (activeSocket) activeSocket.destroy();
          try {
            const rawBuf = Buffer.concat(chunks);
            const bodyBuf = method === 'HEAD' ? Buffer.alloc(0) : decompressBuffer(rawBuf, res.headers['content-encoding']);
            const cleanHeaders = new Headers();
            for (const [k, v] of Object.entries(res.headers)) {
              if (!v || ['content-encoding', 'content-length', 'transfer-encoding', 'connection'].includes(k.toLowerCase())) continue;
              cleanHeaders.set(k, Array.isArray(v) ? v.join(', ') : String(v));
            }
            const noBody = method === 'HEAD' || [204, 205, 304].includes(code);
            finish(resolve, new Response(noBody ? null : bodyBuf, {
              status: code,
              statusText: res.statusMessage || '',
              headers: cleanHeaders
            }));
          } catch (err) {
            finish(reject, err);
          }
        });
        res.on('error', (err) => finish(reject, err));
      };

      if (target.protocol === 'http:') {
        const req = http.request({
          host: proxyUrl.hostname,
          port: Number(proxyUrl.port) || 7897,
          method,
          path: target.href,
          headers: reqHeaders,
          agent: false
        }, handleIncoming);
        req.on('socket', (s) => { activeSocket = s; });
        req.on('error', (err) => finish(reject, err));
        if (init.body) req.write(init.body);
        req.end();
        return;
      }

      const targetPort = Number(target.port) || 443;
      const connectReq = http.request({
        host: proxyUrl.hostname,
        port: Number(proxyUrl.port) || 7897,
        method: 'CONNECT',
        path: `${target.hostname}:${targetPort}`,
        headers: { host: `${target.hostname}:${targetPort}`, connection: 'close' },
        agent: false
      });

      connectReq.on('connect', (connectRes, socket) => {
        if (connectRes.statusCode !== 200) {
          socket.destroy();
          finish(reject, new Error(`Proxy CONNECT HTTP ${connectRes.statusCode}`));
          return;
        }
        const tlsSocket = tls.connect({
          socket,
          servername: target.hostname,
          ALPNProtocols: ['http/1.1']
        });
        activeSocket = tlsSocket;
        tlsSocket.on('error', (err) => finish(reject, err));

        const httpsReq = https.request({
          host: target.hostname,
          port: targetPort,
          method,
          path: `${target.pathname}${target.search}`,
          headers: reqHeaders,
          agent: false,
          createConnection: () => tlsSocket
        }, handleIncoming);
        httpsReq.on('error', (err) => finish(reject, err));
        if (init.body) httpsReq.write(init.body);
        httpsReq.end();
      });

      connectReq.on('error', (err) => {
        origFetch(targetInput, init).then((r) => finish(resolve, r), () => finish(reject, err));
      });
      connectReq.end();
    });
  }

  globalThis.fetch = (input, init) => requestViaProxy(input, init);
}
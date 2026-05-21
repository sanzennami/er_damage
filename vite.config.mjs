import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const helpNotesPath = path.join(rootDir, 'src', 'data', 'helpNotes.json');

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
    });
    request.on('end', () => resolve(body));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

function helpNotesEditorPlugin() {
  function installHelpNotesMiddleware(server) {
    server.middlewares.use('/api/help-notes', async (request, response, next) => {
      if (request.method !== 'POST') {
        next();
        return;
      }

      try {
        const body = await readRequestBody(request);
        const payload = JSON.parse(body || '{}');
        const notes = payload.notes;

        if (!notes || Array.isArray(notes) || typeof notes !== 'object') {
          sendJson(response, 400, { error: 'Invalid help notes payload.' });
          return;
        }

        const normalized = Object.fromEntries(
          Object.entries(notes)
            .filter(([key, value]) => typeof key === 'string' && typeof value === 'string')
            .sort(([left], [right]) => left.localeCompare(right))
        );

        await fs.writeFile(helpNotesPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
        sendJson(response, 200, { ok: true });
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Failed to save help notes.' });
      }
    });
  }

  return {
    name: 'help-notes-editor',
    configureServer(server) {
      installHelpNotesMiddleware(server);
    },
    configurePreviewServer(server) {
      installHelpNotesMiddleware(server);
    }
  };
}

export default defineConfig({
  plugins: [react(), helpNotesEditorPlugin()]
});

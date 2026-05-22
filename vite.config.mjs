import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const helpNotesPath = path.join(rootDir, 'src', 'data', 'helpNotes.json');
const announcementPath = path.join(rootDir, 'src', 'data', 'announcement.json');
const localConfigPath = path.join(rootDir, 'src', 'data', 'localConfig.json');
const localConfigExportPath = path.join(rootDir, 'src', 'data', 'localConfig.export.json');

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

function normalizeConfig(config) {
  return {
    equipment: Array.isArray(config?.equipment) ? config.equipment : [],
    skills: Array.isArray(config?.skills) ? config.skills : [],
    talents: Array.isArray(config?.talents) ? config.talents : [],
    combos: Array.isArray(config?.combos) ? config.combos : []
  };
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

    server.middlewares.use('/api/announcement', async (request, response, next) => {
      if (request.method !== 'POST') {
        next();
        return;
      }

      try {
        const body = await readRequestBody(request);
        const payload = JSON.parse(body || '{}');
        const announcement = payload.announcement;

        if (!announcement || Array.isArray(announcement) || typeof announcement !== 'object') {
          sendJson(response, 400, { error: 'Invalid announcement payload.' });
          return;
        }

        const normalized = {
          title: typeof announcement.title === 'string' ? announcement.title : '',
          body: typeof announcement.body === 'string' ? announcement.body : '',
          history: typeof announcement.history === 'string' ? announcement.history : '',
          updatedAt: typeof announcement.updatedAt === 'string' ? announcement.updatedAt : '',
          showBadge: typeof announcement.showBadge === 'boolean' ? announcement.showBadge : false
        };

        await fs.writeFile(announcementPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
        sendJson(response, 200, { ok: true });
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Failed to save announcement.' });
      }
    });

    server.middlewares.use('/api/config', async (request, response, next) => {
      if (request.method !== 'POST') {
        next();
        return;
      }

      try {
        const body = await readRequestBody(request);
        const payload = JSON.parse(body || '{}');
        const config = payload.config;

        if (!config || Array.isArray(config) || typeof config !== 'object') {
          sendJson(response, 400, { error: 'Invalid config payload.' });
          return;
        }

        const normalized = normalizeConfig(config);

        await fs.writeFile(localConfigPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
        sendJson(response, 200, { ok: true });
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Failed to save config.' });
      }
    });

    server.middlewares.use('/api/config/export', async (request, response, next) => {
      if (request.method !== 'POST') {
        next();
        return;
      }

      try {
        const body = await readRequestBody(request);
        const payload = JSON.parse(body || '{}');
        const config = payload.config;

        if (!config || Array.isArray(config) || typeof config !== 'object') {
          sendJson(response, 400, { error: 'Invalid config payload.' });
          return;
        }

        const normalized = normalizeConfig(config);

        await fs.writeFile(localConfigExportPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
        sendJson(response, 200, { ok: true, path: 'src/data/localConfig.export.json' });
      } catch (error) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Failed to export config.' });
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

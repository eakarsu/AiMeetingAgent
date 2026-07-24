import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { identity, login, saveAiResult } from './store.js';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const indexPath = path.join(projectRoot, 'public', 'index.html');

function json(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(value));
}

async function readJson(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 65_536) throw new Error('request body is too large');
  }
  return raw ? JSON.parse(raw) : {};
}

function bearer(req) {
  const match = String(req.headers.authorization || '').match(/^Bearer (.+)$/);
  return match?.[1] || '';
}

async function openRouterMeetingBrief(prompt) {
  const base = String(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/+$/, '');
  const model = process.env.OPENROUTER_MODEL;
  if (!process.env.OPENROUTER_API_KEY || !model) throw new Error('OpenRouter configuration is required');
  const response = await fetch(`${base}/chat/completions`, {
    method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json', 'X-Title': 'AI Meeting Agent' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: 'Create a concise meeting preparation brief with agenda, risks, open questions, and follow-ups. State assumptions.' }, { role: 'user', content: prompt }], temperature: 0.3 })
  });
  if (!response.ok) throw new Error(`OpenRouter returned HTTP ${response.status}`);
  const data = await response.json();
  const output = String(data?.choices?.[0]?.message?.content || '').trim();
  if (!output) throw new Error('OpenRouter returned empty content');
  return { output, model: data.model || model };
}

export function validateDraft(body) {
  return typeof body.title !== 'string' || !body.title.trim() || !Array.isArray(body.participants) || body.participants.length === 0 ? 'title and at least one participant are required' : null;
}

export function createDraft(body) {
  return { id: randomUUID(), status: 'draft', transcriptStatus: 'not-connected', title: body.title.trim(), participants: body.participants, createdAt: new Date().toISOString() };
}

export function createApp() {
  return createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (req.method === 'GET' && url.pathname === '/api/health') {
        return json(res, 200, { status: 'ok', service: 'ai-meeting-agent', scope: 'minimal-local-boundary' });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const body = await readJson(req);
        const session = await login(body.email, body.password);
        return session ? json(res, 200, session) : json(res, 401, { error: 'invalid credentials' });
      }
      if (req.method === 'GET' && url.pathname === '/api/auth/me') {
        const user = await identity(bearer(req));
        return user ? json(res, 200, { user }) : json(res, 401, { error: 'authentication required' });
      }
      if (req.method === 'POST' && url.pathname === '/api/ai/meeting-brief') {
        const user = await identity(bearer(req));
        if (!user) return json(res, 401, { error: 'authentication required' });
        const body = await readJson(req);
        const prompt = String(body.prompt || '').trim();
        if (prompt.length < 20) return json(res, 400, { error: 'prompt must contain at least 20 characters' });
        const result = await openRouterMeetingBrief(prompt);
        const id = await saveAiResult(user.id, { prompt }, result.output, result.model);
        return json(res, 200, { id, brief: result.output, model: result.model });
      }
      if (req.method === 'POST' && url.pathname === '/api/meetings') {
        const body = await readJson(req);
        const validationError = validateDraft(body);
        if (validationError) return json(res, 400, { error: validationError });
        const record = createDraft(body);
        return json(res, 201, { data: record, warning: 'Local draft only; external execution is not connected.' });
      }
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        const html = await readFile(indexPath);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(html);
      }
      return json(res, 404, { error: 'not found' });
    } catch (error) {
      const status = error instanceof SyntaxError ? 400 : 500;
      return json(res, status, { error: status === 400 ? 'invalid JSON body' : error.message });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 3000);
  createApp().listen(port, '127.0.0.1', () => {
    console.log(`AI Meeting Agent minimal boundary listening on http://127.0.0.1:${port}`);
  });
}

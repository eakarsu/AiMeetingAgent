import { createApp } from './server.js';
import { closeStore, initializeStore } from './store.js';

const apiPort = Number(process.env.BACKEND_PORT);
const uiPort = Number(process.env.FRONTEND_PORT);
if (!Number.isInteger(apiPort) || !Number.isInteger(uiPort) || apiPort === uiPort) throw new Error('Distinct BACKEND_PORT and FRONTEND_PORT values are required');

await initializeStore();
const apiServer = createApp().listen(apiPort, '127.0.0.1', () => console.log(`AI Meeting Agent API listening on http://127.0.0.1:${apiPort}`));
const uiServer = createApp().listen(uiPort, '127.0.0.1', () => console.log(`AI Meeting Agent UI listening on http://127.0.0.1:${uiPort}`));

async function shutdown() {
  await Promise.all([apiServer, uiServer].map((server) => new Promise((resolve) => server.close(resolve))));
  await closeStore();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

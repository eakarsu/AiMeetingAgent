import { createApp } from './server.js';

const port = Number(process.env.PORT || 3000);

createApp().listen(port, '127.0.0.1', () => {
  console.log(`AI Meeting Agent minimal boundary listening on http://127.0.0.1:${port}`);
});

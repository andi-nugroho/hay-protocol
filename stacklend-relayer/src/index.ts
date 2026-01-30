import { startServer, pollLoop } from './server.js';

startServer();
// Fire-and-forget background loop
void pollLoop();
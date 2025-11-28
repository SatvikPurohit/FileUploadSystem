import '@hapi/inert';              
import Hapi from '@hapi/hapi';

import authRoutes from './routes/auth';
import uploadRoutes from './routes/upload';
import downloadRoutes from './routes/download';
import staticRoutes from './routes/static';
import { PORT, FRONTEND_URL } from './config';
import InertPlugin from './plugins/inert';



async function start() {
  const server = Hapi.server({
    port: PORT,
    host: '0.0.0.0',
    routes: {
      cors: {
        origin: [FRONTEND_URL, 'http://localhost:3000'],
      },
      payload: {
        parse: true,
        allow: 'application/json',
      },
    },
  });

  // register the actual plugin object
 await server.register(InertPlugin);

  // ensure your route modules export ServerRoute[]
  server.route(authRoutes);
  server.route(uploadRoutes);
  server.route(downloadRoutes);
  server.route(staticRoutes);

  await server.start();
  console.log('Server running on %s', server.info.uri);
}

start().catch((e) => {
  console.error(e);
  process.exit(1);
});

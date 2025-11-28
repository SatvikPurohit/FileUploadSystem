import { ServerRoute } from '@hapi/hapi';
import { UPLOADS_DIR } from '../config';

const routes: ServerRoute[] = [
  {
    method: 'GET',
    path: '/uploads/{param*}',
    handler: {
      directory: {
        path: UPLOADS_DIR,
        listing: false,
        index: false
      }
    }
  }
];

export default routes;

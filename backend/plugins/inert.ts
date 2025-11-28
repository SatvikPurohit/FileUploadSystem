import { Plugin } from '@hapi/hapi';
import Inert from '@hapi/inert';

const InertPlugin: Plugin<any> = {
  name: 'inert-wrapper',
  version: '1.0.0',
  register: async (server) => {
    // delegate to the official inert plugin
    await server.register(Inert as any);
  }
};

export default InertPlugin;

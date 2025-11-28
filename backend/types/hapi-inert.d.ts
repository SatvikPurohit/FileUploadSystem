import '@hapi/inert';

declare module '@hapi/hapi' {
  interface ResponseToolkit {
    file(path: string, options?: any): any;
  }
}
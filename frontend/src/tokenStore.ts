let _token: string | null = null;

export const tokenStore = {
  set(token: string) { _token = token; },
  get(): string | null { return _token; },
  clear() { _token = null; }
};
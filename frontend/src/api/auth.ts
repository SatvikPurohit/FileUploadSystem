let ACCESS_TOKEN: string | null = null;
export function setAccessToken(t: string | null) {
  ACCESS_TOKEN = t;
}
export function getAccessToken() {
  return ACCESS_TOKEN;
}
export function clearAccessToken() {
  ACCESS_TOKEN = null;
}

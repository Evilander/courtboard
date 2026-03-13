import { isAdminApiPath } from "./routes";

export const CSRF_COOKIE_NAME = "courtboard.csrf";
export const CSRF_HEADER_NAME = "x-courtboard-csrf";

export function isMutatingMethod(method: string) {
  return !["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
}

export function requiresCsrfValidation(pathname: string) {
  return isAdminApiPath(pathname);
}

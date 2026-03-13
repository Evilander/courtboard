import DOMPurify from "isomorphic-dompurify";

export function sanitizeContentHtml(html: string | null | undefined) {
  return DOMPurify.sanitize(html ?? "");
}

type HeaderReader = Pick<Headers, "get">;

export function getIpFromHeaders(headers: HeaderReader) {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || null;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}

import * as OTPAuth from "otpauth";
import { getCourthouseName } from "@/lib/env";

function createTotp(secret: string, accountLabel: string) {
  return new OTPAuth.TOTP({
    issuer: getCourthouseName(),
    label: accountLabel,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secret),
  });
}

export function createTotpSetup(username: string) {
  const secret = new OTPAuth.Secret({ size: 20 }).base32;
  const totp = createTotp(secret, username);

  return {
    secret,
    uri: totp.toString(),
  };
}

export function verifyTotpToken(
  secret: string,
  token: string,
  username: string,
) {
  const sanitizedToken = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(sanitizedToken)) {
    return false;
  }

  const totp = createTotp(secret, username);
  return totp.validate({ token: sanitizedToken, window: 1 }) !== null;
}

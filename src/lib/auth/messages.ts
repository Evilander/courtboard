const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials:
    "The username, password, or authenticator code is incorrect.",
  account_locked:
    "This account is temporarily locked after repeated failed sign-in attempts.",
  totp_required: "This account requires a six-digit authenticator code.",
  invalid_totp: "The authenticator code is invalid or expired.",
};

export function mapSignInCodeToMessage(code?: string) {
  if (!code) {
    return "Unable to sign in. Check your credentials and try again.";
  }

  return AUTH_MESSAGES[code] ?? AUTH_MESSAGES.invalid_credentials;
}

import { CredentialsSignin } from "next-auth";

export class InvalidCredentialsError extends CredentialsSignin {
  code = "invalid_credentials";
}

export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

export class TotpRequiredError extends CredentialsSignin {
  code = "totp_required";
}

export class InvalidTotpError extends CredentialsSignin {
  code = "invalid_totp";
}

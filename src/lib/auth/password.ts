import bcrypt from "bcryptjs";

export const PASSWORD_POLICY_HINT =
  "Use at least 12 characters with upper, lower, number, and symbol characters.";

export function validatePasswordStrength(password: string) {
  const meetsLength = password.length >= 12;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasDigit = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);

  return (
    meetsLength && hasUppercase && hasLowercase && hasDigit && hasSymbol
  );
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

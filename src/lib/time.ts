export const HEARTBEAT_INTERVAL_MS = 60_000;
export const SCREEN_ONLINE_WINDOW_MS = 2 * 60_000;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function toDateKey(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function isScreenOnline(lastSeenAt?: Date | null) {
  if (!lastSeenAt) {
    return false;
  }

  return Date.now() - lastSeenAt.getTime() <= SCREEN_ONLINE_WINDOW_MS;
}

export function formatLongDisplayDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatAdminDateTime(value?: string | Date | null) {
  if (!value) {
    return "Never";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function toDateInputValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return toDateKey(date);
}

export function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function formatDisplayTime(value: Date | string) {
  if (value instanceof Date) {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(value);
  }

  return value;
}

export function slugifyValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

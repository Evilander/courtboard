"use client";

function readCookie(name: string) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export async function apiFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? "GET").toUpperCase();

  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    const csrf = readCookie("courtboard.csrf");
    if (csrf) {
      headers.set("x-courtboard-csrf", csrf);
    }
  }

  const response = await fetch(input, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const payload = await response
      .json()
      .catch(async () => ({ error: await response.text() }));
    throw new Error(
      typeof payload?.error === "string" ? payload.error : "Request failed.",
    );
  }

  return response.json() as Promise<T>;
}

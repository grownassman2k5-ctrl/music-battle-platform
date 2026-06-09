"use client";

const adminAccessStorageKey = "music-battle-platform.admin-access.v1";

export function readStoredAdminAccessToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(adminAccessStorageKey) ?? "";
}

export function saveStoredAdminAccessToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(adminAccessStorageKey, token);
}

export function clearStoredAdminAccessToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(adminAccessStorageKey);
}

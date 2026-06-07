"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  LOCAL_BATTLE_STORAGE_EVENT,
  LOCAL_BATTLE_STORAGE_KEY,
  parseLocalBattleSetup,
} from "@/lib/local-demo-store";

function subscribeToLocalBattleSetup(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === LOCAL_BATTLE_STORAGE_KEY) {
      onStoreChange();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(LOCAL_BATTLE_STORAGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(LOCAL_BATTLE_STORAGE_EVENT, onStoreChange);
  };
}

function getLocalBattleSnapshot() {
  if (typeof window === "undefined") {
    return "";
  }

  return window.localStorage.getItem(LOCAL_BATTLE_STORAGE_KEY) ?? "";
}

function getServerBattleSnapshot() {
  return "";
}

export function useLocalBattleSetup() {
  const rawSetup = useSyncExternalStore(
    subscribeToLocalBattleSetup,
    getLocalBattleSnapshot,
    getServerBattleSnapshot,
  );

  return useMemo(() => parseLocalBattleSetup(rawSetup), [rawSetup]);
}

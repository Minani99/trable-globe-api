"use client";

import { useSyncExternalStore } from "react";

export type ColorTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "travel-globe-theme";
const THEME_CHANGE_EVENT = "travel-globe:themechange";

function readTheme(): ColorTheme {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

function subscribeTheme(onStoreChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      onStoreChange();
    }
  };

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", handleStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", handleStorage);
  };
}

/** Keeps every client-side globe and control in sync with the root colour theme. */
export function useColorTheme(): ColorTheme {
  return useSyncExternalStore(subscribeTheme, readTheme, () => "light");
}

export function applyColorTheme(theme: ColorTheme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // The visual toggle still works when private browsing blocks persistent storage.
  }
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

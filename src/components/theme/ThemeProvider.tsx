"use client";

import {
  createContext, useCallback, useContext, useSyncExternalStore,
  type ReactNode,
} from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";
const STORAGE_KEY = "tb-theme";
const CHANGE_EVENT = "tb-theme-change";

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}
function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}
function getServerSnapshot(): Theme {
  return "light";
}

type VTDocument = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/** OSS uses one product palette with light/dark modes, not hosted-product skins. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const next: Theme = root.classList.contains("dark") ? "light" : "dark";
    localStorage.setItem(STORAGE_KEY, next);
    root.classList.add("theme-switching");
    const apply = () => flushSync(() => {
      root.classList.toggle("dark", next === "dark");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    });
    const cleanup = () => root.classList.remove("theme-switching");
    const doc = document as VTDocument;
    if (doc.startViewTransition) {
      const vt = doc.startViewTransition(apply);
      vt.finished.then(cleanup, cleanup);
    } else {
      apply();
      requestAnimationFrame(() => requestAnimationFrame(cleanup));
    }
  }, []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme mora biti unutar ThemeProvider-a");
  return ctx;
}

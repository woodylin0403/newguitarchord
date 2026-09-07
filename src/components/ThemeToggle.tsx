"use client";

import { useSyncExternalStore } from "react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Theme = "system" | "light" | "dark";
const KEY = "hymnbook.theme";
const EVENT = "hymnbook:theme";

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function apply(theme: Theme) {
  const el = document.documentElement;
  if (theme === "system") {
    delete el.dataset.theme;
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  } else {
    el.dataset.theme = theme;
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

const NEXT: Record<Theme, Theme> = {
  system: "light",
  light: "dark",
  dark: "system",
};
const LABEL: Record<Theme, string> = {
  system: "跟隨系統",
  light: "淺色",
  dark: "深色",
};

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, read, () => "system" as Theme);

  return (
    <button
      type="button"
      onClick={() => apply(NEXT[theme])}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "text-muted",
      )}
      aria-label={`主題：${LABEL[theme]}（點擊切換）`}
      title={`主題：${LABEL[theme]}`}
    >
      {theme === "dark" ? (
        <MoonIcon />
      ) : theme === "light" ? (
        <SunIcon />
      ) : (
        <AutoIcon />
      )}
    </button>
  );
}

function SunIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}
function AutoIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3a9 9 0 0 0 0 18Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

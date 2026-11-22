"use client";
import { useCallback, useEffect, useState } from "react";

export interface Theme { dark: boolean; xmas: boolean }
const KEY = "ourTheme";

function read(): Theme {
  try { return { dark: true, xmas: true, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { dark: true, xmas: true }; }
}
function apply(t: Theme) {
  document.documentElement.dataset.theme = t.dark ? "dark" : "light";
  document.documentElement.dataset.xmas = t.xmas ? "on" : "off";
}
/** Runs before first paint (inline in the root layout) so there's no flash of the wrong theme. */
export const THEME_BOOT = `try{var t=JSON.parse(localStorage.getItem("${KEY}")||"{}");document.documentElement.dataset.theme=t.dark===false?"light":"dark";document.documentElement.dataset.xmas=t.xmas===false?"off":"on"}catch(e){}`;

/** Dark mode and Christmas mode, remembered on this device. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>({ dark: true, xmas: true });
  useEffect(() => {
    setTheme(read());
    const h = () => setTheme(read());
    window.addEventListener("theme-change", h);
    return () => window.removeEventListener("theme-change", h);
  }, []);
  const update = useCallback((p: Partial<Theme>) => {
    const next = { ...read(), ...p };
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    apply(next); window.dispatchEvent(new Event("theme-change"));
  }, []);
  return { ...theme, setDark: (d: boolean) => update({ dark: d }), setXmas: (x: boolean) => update({ xmas: x }) };
}

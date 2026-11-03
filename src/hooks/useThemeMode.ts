import { useSyncExternalStore } from "react";

export type ThemeMode = "dark" | "light";

const STORAGE_KEY = "cfe:theme-mode";
const listeners = new Set<() => void>();

function readStored(): ThemeMode {
    try {
        return localStorage.getItem(STORAGE_KEY) === "light" ? "light" : "dark";
    } catch {
        return "dark"; // storage can be blocked; the choice then lasts until reload
    }
}

let mode: ThemeMode = readStored();

/** CSS variables switch on this attribute (see styles/colors.css). */
function applyToDocument() {
    if (typeof document !== "undefined") {
        document.documentElement.setAttribute("data-theme", mode);
    }
}
applyToDocument();

export function setThemeMode(next: ThemeMode): void {
    mode = next;
    try {
        localStorage.setItem(STORAGE_KEY, next);
    } catch {
        // see readStored
    }
    applyToDocument();
    listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

/** Whole-window dark/light mode, shared by every component and remembered across visits. */
export default function useThemeMode(): [ThemeMode, () => void] {
    const current = useSyncExternalStore(subscribe, () => mode);
    return [current, () => setThemeMode(current === "dark" ? "light" : "dark")];
}

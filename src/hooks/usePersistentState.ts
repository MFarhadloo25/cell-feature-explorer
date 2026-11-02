import { useState } from "react";

/** useState that also survives remounts and reloads (sessionStorage); falls back to plain state if storage is unavailable. */
export default function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
    const storageKey = `cfe:${key}`;
    const [value, setValue] = useState<T>(() => {
        try {
            const raw = sessionStorage.getItem(storageKey);
            return raw === null ? initial : (JSON.parse(raw) as T);
        } catch {
            return initial;
        }
    });
    const set = (next: T) => {
        setValue(next);
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
            // storage unavailable (private mode); state still works for this mount
        }
    };
    return [value, set];
}

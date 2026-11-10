import type { HistoryItem } from "@/lib/types";

const KEY = "flame-tool-history-v1";
const EVENT = "flame-tool-history";
const EMPTY: HistoryItem[] = [];

let memory: HistoryItem[] = EMPTY;
let loaded = false;

export function subscribeHistory(callback: () => void) {
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}

export function getHistorySnapshot(): HistoryItem[] {
  if (!loaded) {
    loaded = true;
    memory = readStored();
  }
  return memory;
}

export function getEmptyHistory(): HistoryItem[] {
  return EMPTY;
}

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readStored(): HistoryItem[] {
  const store = storage();
  if (!store) return EMPTY;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    const items = parsed.filter(isHistoryItem).slice(0, 30);
    return items.length > 0 ? items : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function saveHistory(items: HistoryItem[]): void {
  memory = items.slice(0, 30);
  loaded = true;
  const store = storage();
  if (store) {
    try {
      store.setItem(KEY, JSON.stringify(memory));
    } catch {
      // A full session store should not block the answer on screen.
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
}

export function plainSnippet(text: string): string {
  return text
    .replace(/\$\$([\s\S]+?)\$\$/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\\text\{([^}]+)\}/g, "$1")
    .replace(/\\mathrm\{([^}]+)\}/g, "$1")
    .replace(/\\rightarrow/g, "→")
    .replace(/[{}]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isHistoryItem(value: unknown): value is HistoryItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<HistoryItem>;
  return (
    typeof item.id === "string" &&
    typeof item.createdAt === "number" &&
    typeof item.mock === "boolean" &&
    !!item.solution &&
    typeof item.solution.answer === "string" &&
    typeof item.solution.problemText === "string"
  );
}

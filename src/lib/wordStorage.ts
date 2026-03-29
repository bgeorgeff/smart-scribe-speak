const STORAGE_KEY = "learn-anything-clicked-words";

export interface ClickedWord {
  word: string;
  syllables: string | null;
  clickedAt: string; // ISO timestamp
}

export function saveWord(word: string, syllables: string | null): void {
  const words = getWords();
  const existing = words.find((w) => w.word.toLowerCase() === word.toLowerCase());
  if (existing) {
    // Update timestamp on re-click
    existing.clickedAt = new Date().toISOString();
    if (syllables) existing.syllables = syllables;
  } else {
    words.push({ word, syllables, clickedAt: new Date().toISOString() });
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

export function getWords(): ClickedWord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removeWord(word: string): void {
  const words = getWords().filter(
    (w) => w.word.toLowerCase() !== word.toLowerCase()
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

export function clearWords(): void {
  localStorage.removeItem(STORAGE_KEY);
}

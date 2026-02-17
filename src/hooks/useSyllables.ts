import { useState, useEffect, useRef, useCallback } from "react";

type SyllableMap = Record<string, string>;

const OVERRIDES_KEY = "syllable_overrides";

let cachedSyllableMap: SyllableMap | null = null;
let loadingPromise: Promise<SyllableMap> | null = null;

function getOverrides(): SyllableMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

async function loadSyllableData(): Promise<SyllableMap> {
  if (cachedSyllableMap) return cachedSyllableMap;
  if (loadingPromise) return loadingPromise;

  loadingPromise = fetch("/syllables.json")
    .then((res) => res.json())
    .then((data: SyllableMap) => {
      cachedSyllableMap = data;
      return data;
    })
    .catch((err) => {
      console.error("Failed to load syllable data:", err);
      loadingPromise = null;
      return {} as SyllableMap;
    });

  return loadingPromise;
}

export function useSyllables() {
  const [isLoaded, setIsLoaded] = useState(!!cachedSyllableMap);
  const mapRef = useRef<SyllableMap>(cachedSyllableMap || {});

  useEffect(() => {
    if (cachedSyllableMap) {
      mapRef.current = cachedSyllableMap;
      setIsLoaded(true);
      return;
    }

    loadSyllableData().then((data) => {
      mapRef.current = data;
      setIsLoaded(true);
    });
  }, []);

  const getSyllables = useCallback((word: string): string | null => {
    const key = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!key) return null;

    const overrides = getOverrides();
    const overrideResult = overrides[key];
    if (overrideResult) {
      return overrideResult.replace(/-/g, "\u00b7 ");
    }

    const result = mapRef.current[key];
    if (result) {
      return result.replace(/-/g, "\u00b7 ");
    }
    return null;
  }, []);

  return { getSyllables, isLoaded };
}

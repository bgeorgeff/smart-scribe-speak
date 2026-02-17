import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type SyllableMap = Record<string, string>;

let cachedSyllableMap: SyllableMap | null = null;
let cachedOverrides: SyllableMap | null = null;
let loadingPromise: Promise<SyllableMap> | null = null;
let overridesPromise: Promise<SyllableMap> | null = null;

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

async function loadOverrides(): Promise<SyllableMap> {
  if (cachedOverrides) return cachedOverrides;
  if (overridesPromise) return overridesPromise;

  overridesPromise = (async () => {
    const { data, error } = await supabase
      .from("syllable_overrides")
      .select("word, syllables");

    if (error) {
      console.error("Failed to load syllable overrides:", error);
      overridesPromise = null;
      return {} as SyllableMap;
    }
    const map: SyllableMap = {};
    for (const row of data || []) {
      map[row.word] = row.syllables;
    }
    cachedOverrides = map;
    return map;
  })();

  return overridesPromise;
}

export function invalidateOverridesCache() {
  cachedOverrides = null;
  overridesPromise = null;
}

export function useSyllables() {
  const [isLoaded, setIsLoaded] = useState(!!cachedSyllableMap && !!cachedOverrides);
  const mapRef = useRef<SyllableMap>(cachedSyllableMap || {});
  const overridesRef = useRef<SyllableMap>(cachedOverrides || {});

  useEffect(() => {
    Promise.all([loadSyllableData(), loadOverrides()]).then(([data, overrides]) => {
      mapRef.current = data;
      overridesRef.current = overrides;
      setIsLoaded(true);
    });
  }, []);

  const getSyllables = useCallback((word: string): string | null => {
    const key = word.toLowerCase().replace(/[^a-z'-]/g, "");
    if (!key) return null;

    const overrideResult = overridesRef.current[key];
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

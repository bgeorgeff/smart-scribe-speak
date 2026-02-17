import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Save, Download, Upload, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

type SyllableMap = Record<string, string>;

const OVERRIDES_KEY = "syllable_overrides";

function getOverrides(): SyllableMap {
  try {
    const raw = localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: SyllableMap) {
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
}

const SyllableEditor = () => {
  const [syllableMap, setSyllableMap] = useState<SyllableMap>({});
  const [overrides, setOverrides] = useState<SyllableMap>(getOverrides());
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ word: string; syllables: string; isOverride: boolean }>>([]);
  const [editWord, setEditWord] = useState("");
  const [editSyllables, setEditSyllables] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/syllables.json")
      .then((res) => res.json())
      .then((data: SyllableMap) => {
        setSyllableMap(data);
        setIsLoaded(true);
      })
      .catch(() => {
        toast({ title: "Error", description: "Failed to load syllable data.", variant: "destructive" });
      });
  }, []);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{ word: string; syllables: string; isOverride: boolean }> = [];

    if (overrides[query]) {
      results.push({ word: query, syllables: overrides[query], isOverride: true });
    } else if (syllableMap[query]) {
      results.push({ word: query, syllables: syllableMap[query], isOverride: false });
    }

    const allKeys = new Set([...Object.keys(syllableMap), ...Object.keys(overrides)]);
    for (const key of allKeys) {
      if (key === query) continue;
      if (key.startsWith(query) || key.includes(query)) {
        const isOverride = !!overrides[key];
        const syllables = overrides[key] ?? syllableMap[key];
        if (syllables) {
          results.push({ word: key, syllables, isOverride });
        }
      }
      if (results.length >= 50) break;
    }

    setSearchResults(results);
  };

  const handleSelectWord = (word: string, syllables: string) => {
    setEditWord(word);
    setEditSyllables(syllables);
  };

  const handleSave = () => {
    if (!editWord.trim() || !editSyllables.trim()) {
      toast({ title: "Missing Info", description: "Please enter both a word and its syllable breakdown.", variant: "destructive" });
      return;
    }
    const key = editWord.toLowerCase().trim();
    const newOverrides = { ...overrides, [key]: editSyllables.trim() };
    setOverrides(newOverrides);
    saveOverrides(newOverrides);

    setSearchResults((prev) =>
      prev.map((r) => (r.word === key ? { ...r, syllables: editSyllables.trim(), isOverride: true } : r))
    );

    toast({ title: "Saved", description: `Updated syllable breakdown for "${key}".` });
  };

  const handleRemoveOverride = (word: string) => {
    const newOverrides = { ...overrides };
    delete newOverrides[word];
    setOverrides(newOverrides);
    saveOverrides(newOverrides);

    setSearchResults((prev) =>
      prev.map((r) => {
        if (r.word === word) {
          const original = syllableMap[word];
          return original ? { ...r, syllables: original, isOverride: false } : r;
        }
        return r;
      }).filter((r) => syllableMap[r.word] || newOverrides[r.word])
    );

    toast({ title: "Override Removed", description: `Reverted "${word}" to original.` });
  };

  const handleExportOverrides = () => {
    const blob = new Blob([JSON.stringify(overrides, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "syllable_overrides.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportOverrides = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
          const validated: SyllableMap = {};
          for (const [k, v] of Object.entries(raw)) {
            if (typeof k === "string" && typeof v === "string" && k.trim() && v.trim()) {
              validated[k.toLowerCase().trim()] = v.trim();
            }
          }
          const merged = { ...overrides, ...validated };
          setOverrides(merged);
          saveOverrides(merged);
          toast({ title: "Imported", description: `Imported ${Object.keys(validated).length} overrides.` });
        }
      } catch {
        toast({ title: "Error", description: "Invalid JSON file.", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Syllable Editor</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Search & Edit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for a word..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-search-word"
              />
              <Button onClick={handleSearch} disabled={!isLoaded} data-testid="button-search">
                <Search className="w-4 h-4 mr-1" />
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="border border-border rounded-md max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.word}
                    onClick={() => handleSelectWord(result.word, result.syllables)}
                    data-testid={`result-${result.word}`}
                    className="w-full text-left px-3 py-2 hover-elevate flex items-center justify-between gap-2 border-b border-border last:border-b-0"
                  >
                    <div>
                      <span className="font-medium text-foreground">{result.word}</span>
                      <span className="text-muted-foreground ml-2">{result.syllables.replace(/-/g, "\u00b7 ")}</span>
                    </div>
                    {result.isOverride && (
                      <span className="text-xs text-primary font-medium">edited</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="border-t border-border pt-4 space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Word</label>
                <Input
                  value={editWord}
                  onChange={(e) => setEditWord(e.target.value)}
                  placeholder="e.g., american"
                  data-testid="input-edit-word"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Syllable Breakdown (use hyphens)</label>
                <Input
                  value={editSyllables}
                  onChange={(e) => setEditSyllables(e.target.value)}
                  placeholder="e.g., A-me-ri-can"
                  data-testid="input-edit-syllables"
                />
                {editSyllables && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Preview: {editSyllables.replace(/-/g, "\u00b7 ")}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSave} data-testid="button-save-syllable">
                  <Save className="w-4 h-4 mr-1" />
                  Save
                </Button>
                {editWord && overrides[editWord.toLowerCase()] && (
                  <Button variant="outline" onClick={() => handleRemoveOverride(editWord.toLowerCase())} data-testid="button-remove-override">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Revert to Original
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Manage Overrides ({Object.keys(overrides).length} edits)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handleExportOverrides} disabled={Object.keys(overrides).length === 0} data-testid="button-export">
                <Download className="w-4 h-4 mr-1" />
                Export Edits
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} data-testid="button-import">
                <Upload className="w-4 h-4 mr-1" />
                Import Edits
              </Button>
              <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImportOverrides} />
            </div>
            {Object.keys(overrides).length > 0 && (
              <div className="border border-border rounded-md max-h-40 overflow-y-auto">
                {Object.entries(overrides).slice(0, 100).map(([word, syllables]) => (
                  <div key={word} className="flex items-center justify-between px-3 py-1.5 border-b border-border last:border-b-0">
                    <div>
                      <span className="font-medium text-foreground text-sm">{word}</span>
                      <span className="text-muted-foreground text-sm ml-2">{syllables.replace(/-/g, "\u00b7 ")}</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveOverride(word)} data-testid={`button-remove-${word}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SyllableEditor;

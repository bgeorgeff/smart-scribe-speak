export interface FontOption {
  value: string;
  label: string;
  description: string;
  cssFamily: string;
}

export const FONT_OPTIONS: FontOption[] = [
  { value: "dyslexic-arial", label: "Arial", description: "Clean, simple sans-serif", cssFamily: "Arial, sans-serif" },
  { value: "dyslexic-verdana", label: "Verdana", description: "Readable screen font", cssFamily: "Verdana, sans-serif" },
  { value: "dyslexic-helvetica", label: "Helvetica", description: "Classic, neutral design", cssFamily: "Helvetica, Arial, sans-serif" },
  { value: "dyslexic-tahoma", label: "Tahoma", description: "Compact, clear letters", cssFamily: "Tahoma, sans-serif" },
  { value: "dyslexic-calibri", label: "Calibri", description: "Modern, friendly design", cssFamily: "Calibri, sans-serif" },
  { value: "dyslexic-comic", label: "Comic Sans MS", description: "Casual, rounded letters", cssFamily: "'Comic Sans MS', cursive" },
];

export function getCssFontFamily(fontValue: string): string {
  const found = FONT_OPTIONS.find((f) => f.value === fontValue);
  return found?.cssFamily ?? "Arial, sans-serif";
}

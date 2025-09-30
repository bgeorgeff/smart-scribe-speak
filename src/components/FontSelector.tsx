import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const FontSelector = ({ value, onChange }: FontSelectorProps) => {
  const fontOptions = [
    { value: "dyslexic-arial", label: "Arial", description: "Clean, simple sans-serif" },
    { value: "dyslexic-verdana", label: "Verdana", description: "Readable screen font" },
    { value: "dyslexic-helvetica", label: "Helvetica", description: "Classic, neutral design" },
    { value: "dyslexic-tahoma", label: "Tahoma", description: "Compact, clear letters" },
    { value: "dyslexic-calibri", label: "Calibri", description: "Modern, friendly design" },
    { value: "dyslexic-comic", label: "Comic Sans MS", description: "Casual, rounded letters" },
  ];

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Font Family (Dyslexic-Friendly)</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select font" />
        </SelectTrigger>
        <SelectContent>
          {fontOptions.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <div className="flex flex-col">
                <span className={`font-${font.value.replace('dyslexic-', '')}`}>
                  {font.label}
                </span>
                <span className="text-xs text-muted-foreground">
                  {font.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
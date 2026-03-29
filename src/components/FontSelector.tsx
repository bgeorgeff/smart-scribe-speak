import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FONT_OPTIONS } from "@/lib/fonts";

interface FontSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export const FontSelector = ({ value, onChange }: FontSelectorProps) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Font Family (Dyslexic-Friendly)</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select font" />
        </SelectTrigger>
        <SelectContent>
          {FONT_OPTIONS.map((font) => (
            <SelectItem key={font.value} value={font.value}>
              <div className="flex flex-col">
                <span style={{ fontFamily: font.cssFamily }}>
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

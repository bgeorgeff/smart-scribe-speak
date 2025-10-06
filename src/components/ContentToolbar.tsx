import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Save, Printer, Type } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ContentToolbarProps {
  fontFamily: string;
  fontSize: number;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
  onSave: () => void;
  onPrint: () => void;
  isSaving?: boolean;
}

const FONT_OPTIONS = [
  { value: "Arial", label: "Arial" },
  { value: "Times New Roman", label: "Times New Roman" },
  { value: "Georgia", label: "Georgia" },
  { value: "Verdana", label: "Verdana" },
  { value: "Comic Sans MS", label: "Comic Sans MS" },
  { value: "Courier New", label: "Courier New" },
];

const FONT_SIZE_LABELS: Record<number, string> = {
  12: "Small",
  16: "Medium",
  20: "Large",
  24: "Extra Large",
};

export const ContentToolbar = ({
  fontFamily,
  fontSize,
  onFontFamilyChange,
  onFontSizeChange,
  onSave,
  onPrint,
  isSaving = false,
}: ContentToolbarProps) => {
  return (
    <Card className="p-4 space-y-4">
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Type className="h-4 w-4" />
          <Select value={fontFamily} onValueChange={onFontFamilyChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select font" />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((font) => (
                <SelectItem key={font.value} value={font.value}>
                  {font.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="text-sm font-medium whitespace-nowrap">Size:</span>
          <Slider
            value={[fontSize]}
            onValueChange={(value) => onFontSizeChange(value[0])}
            min={12}
            max={24}
            step={4}
            className="flex-1"
          />
          <span className="text-sm text-muted-foreground min-w-[80px]">
            {FONT_SIZE_LABELS[fontSize]}
          </span>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button onClick={onSave} disabled={isSaving} variant="default">
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={onPrint} variant="outline">
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
};

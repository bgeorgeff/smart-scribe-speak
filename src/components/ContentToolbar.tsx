import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Save, Printer } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FONT_OPTIONS } from "@/lib/fonts";

interface ContentToolbarProps {
  fontFamily: string;
  fontSize: number;
  onFontFamilyChange: (font: string) => void;
  onFontSizeChange: (size: number) => void;
  onSave: () => void;
  onPrint: () => void;
  isSaving?: boolean;
}

const getFontSizeLabel = (size: number): string => {
  if (size <= 13) return "Small";
  if (size <= 17) return "Medium";
  if (size <= 21) return "Large";
  return "Extra Large";
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
    <Card className="p-3 bg-muted/50 border-border/50">
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={fontFamily} onValueChange={onFontFamilyChange}>
          <SelectTrigger className="w-[160px]" data-testid="select-toolbar-font">
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

        <div className="flex items-center gap-2 flex-1 min-w-[180px]">
          <Slider
            value={[fontSize]}
            onValueChange={(value) => onFontSizeChange(value[0])}
            min={12}
            max={24}
            step={4}
            className="flex-1"
            data-testid="slider-font-size"
          />
          <span className="text-sm text-muted-foreground min-w-[75px] text-right">
            {getFontSizeLabel(fontSize)}
          </span>
        </div>

        <div className="flex gap-2 ml-auto">
          <Button onClick={onSave} disabled={isSaving} variant="default" data-testid="button-save">
            <Save className="h-4 w-4 mr-1" />
            {isSaving ? "Saving..." : "Save"}
          </Button>
          <Button onClick={onPrint} variant="outline" data-testid="button-print">
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>
    </Card>
  );
};

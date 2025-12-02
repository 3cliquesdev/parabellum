import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PRESET_COLORS = [
  "#EF4444", // red
  "#F97316", // orange
  "#EAB308", // yellow
  "#22C55E", // green
  "#14B8A6", // teal
  "#3B82F6", // blue
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#6B7280", // gray
  "#1F2937", // dark gray
  "#78716C", // stone
  "#0EA5E9", // sky
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="space-y-3">
      <Label>Cor da Tag</Label>
      <div className="grid grid-cols-6 gap-2">
        {PRESET_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={cn(
              "h-8 w-8 rounded-md border-2 transition-all hover:scale-110",
              value === color
                ? "border-foreground ring-2 ring-primary ring-offset-2"
                : "border-transparent"
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <div
          className="h-8 w-8 rounded-md border"
          style={{ backgroundColor: value || "#6B7280" }}
        />
        <Input
          type="text"
          placeholder="#000000"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 font-mono"
          maxLength={7}
        />
      </div>
    </div>
  );
}

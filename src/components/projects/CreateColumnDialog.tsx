import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateProjectColumn } from "@/hooks/useProjectColumns";

const columnColors = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#64748b", // Slate
];

const schema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  color: z.string(),
  is_final: z.boolean(),
  notify_client_on_enter: z.boolean(),
});

type FormData = z.infer<typeof schema>;

interface CreateColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boardId: string;
}

export function CreateColumnDialog({ open, onOpenChange, boardId }: CreateColumnDialogProps) {
  const [selectedColor, setSelectedColor] = useState(columnColors[0]);
  const createColumn = useCreateProjectColumn();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      color: columnColors[0],
      is_final: false,
      notify_client_on_enter: false,
    },
  });

  const onSubmit = (data: FormData) => {
    createColumn.mutate(
      {
        board_id: boardId,
        name: data.name,
        color: selectedColor,
      },
      {
        onSuccess: () => {
          form.reset();
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Coluna</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome</Label>
            <Input
              id="name"
              placeholder="Ex: Em Progresso"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex flex-wrap gap-2">
              {columnColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedColor(color)}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="is_final">Coluna final</Label>
              <p className="text-xs text-muted-foreground">
                Cards aqui são considerados concluídos
              </p>
            </div>
            <Switch
              id="is_final"
              checked={form.watch("is_final")}
              onCheckedChange={(checked) => form.setValue("is_final", checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notify">Notificar cliente</Label>
              <p className="text-xs text-muted-foreground">
                Envia email quando card entrar nesta coluna
              </p>
            </div>
            <Switch
              id="notify"
              checked={form.watch("notify_client_on_enter")}
              onCheckedChange={(checked) =>
                form.setValue("notify_client_on_enter", checked)
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createColumn.isPending}>
              Criar Coluna
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

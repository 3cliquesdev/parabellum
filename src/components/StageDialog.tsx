import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useCreateStage } from "@/hooks/useCreateStage";
import { useUpdateStage } from "@/hooks/useUpdateStage";
import type { Tables } from "@/integrations/supabase/types";

const stageSchema = z.object({
  name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
});

type StageFormData = z.infer<typeof stageSchema>;

interface StageDialogProps {
  trigger: React.ReactNode;
  pipelineId: string;
  stage?: Tables<"stages"> | null;
}

export default function StageDialog({ trigger, pipelineId, stage }: StageDialogProps) {
  const [open, setOpen] = useState(false);
  
  const createStage = useCreateStage();
  const updateStage = useUpdateStage();

  const form = useForm<StageFormData>({
    resolver: zodResolver(stageSchema),
    defaultValues: {
      name: stage?.name || "",
    },
  });

  const onSubmit = async (data: StageFormData) => {
    if (stage) {
      await updateStage.mutateAsync({
        id: stage.id,
        name: data.name,
      });
    } else {
      await createStage.mutateAsync({
        name: data.name,
        pipeline_id: pipelineId,
      });
    }
    form.reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {stage ? "Editar Etapa" : "Nova Etapa"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">
                    Nome da Etapa <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Qualificação, Proposta..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={createStage.isPending || updateStage.isPending}>
              {stage ? "Salvar Alterações" : "Criar Etapa"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { DateRange } from "react-day-picker";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { useEmailTemplatesV2 } from "@/hooks/useEmailBuilderV2";
import { useExportEmailSendsReport } from "@/hooks/useExportEmailSendsReport";
import { Label } from "@/components/ui/label";

interface EmailSendsExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EmailSendsExportDialog({ open, onOpenChange }: EmailSendsExportDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [templateId, setTemplateId] = useState<string>("all");
  const [exporting, setExporting] = useState(false);

  const { data: templatesV1 } = useEmailTemplates();
  const { data: templatesV2 } = useEmailTemplatesV2();
  const { exportToExcel } = useExportEmailSendsReport();

  const allTemplates = [
    ...(templatesV1 || []).map((t) => ({ id: t.id, name: t.name })),
    ...(templatesV2 || []).map((t: any) => ({ id: t.id, name: `${t.name} (V2)` })),
  ];

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportToExcel({
        dateRange,
        templateId: templateId === "all" ? undefined : templateId,
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório de Envios</DialogTitle>
          <DialogDescription>
            Filtre por período e template para gerar o Excel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Período</Label>
            <DatePickerWithRange date={dateRange} onDateChange={setDateRange} />
          </div>

          <div className="space-y-2">
            <Label>Template</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os templates</SelectItem>
                {allTemplates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={exporting} className="gap-2">
            <Download className="h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar Excel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

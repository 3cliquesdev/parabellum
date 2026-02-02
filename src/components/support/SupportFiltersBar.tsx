import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupportFilters } from "@/context/SupportFiltersContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Filter, Check, X } from "lucide-react";

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "open", label: "Aberto" },
  { value: "in_progress", label: "Em andamento" },
  { value: "pending", label: "Pendente" },
  { value: "resolved", label: "Resolvido" },
  { value: "closed", label: "Fechado" },
];

const CHANNEL_OPTIONS = [
  { value: "all", label: "Todos os canais" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "chat", label: "Chat" },
  { value: "portal", label: "Portal" },
];

interface Department {
  id: string;
  name: string;
}

interface Agent {
  id: string;
  full_name: string;
}

export function SupportFiltersBar() {
  const {
    draftFilters,
    setDraftFilters,
    applyFilters,
    resetDraft,
    hasPendingChanges,
  } = useSupportFilters();

  // Load departments
  const { data: departments } = useQuery<Department[]>({
    queryKey: ["departments-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("departments")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Department[];
    },
    staleTime: 1000 * 60 * 10,
  });

  // Load agents - using type assertion to avoid deep instantiation
  const { data: agents } = useQuery<Agent[]>({
    queryKey: ["agents-list-support"],
    queryFn: async () => {
      const { data } = await (supabase
        .from("profiles" as any)
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name") as any);
      return (data ?? []) as Agent[];
    },
    staleTime: 1000 * 60 * 10,
  });

  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border/50">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="h-4 w-4" />
        Filtros
      </div>

      {/* Date Range */}
      <DatePickerWithRange
        date={{
          from: draftFilters.startDate,
          to: draftFilters.endDate,
        }}
        onDateChange={(range) => {
          if (range?.from) {
            setDraftFilters({
              startDate: range.from,
              endDate: range.to || range.from,
            });
          }
        }}
      />

      {/* Channel */}
      <Select
        value={draftFilters.channel ?? "all"}
        onValueChange={(value) =>
          setDraftFilters({ channel: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Canal" />
        </SelectTrigger>
        <SelectContent>
          {CHANNEL_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department */}
      <Select
        value={draftFilters.departmentId ?? "all"}
        onValueChange={(value) =>
          setDraftFilters({ departmentId: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Departamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos departamentos</SelectItem>
          {departments?.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Agent */}
      <Select
        value={draftFilters.agentId ?? "all"}
        onValueChange={(value) =>
          setDraftFilters({ agentId: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-[160px] h-9">
          <SelectValue placeholder="Agente" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos agentes</SelectItem>
          {agents?.map((agent) => (
            <SelectItem key={agent.id} value={agent.id}>
              {agent.full_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Status */}
      <Select
        value={draftFilters.status ?? "all"}
        onValueChange={(value) =>
          setDraftFilters({ status: value === "all" ? null : value })
        }
      >
        <SelectTrigger className="w-[140px] h-9">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Apply / Reset buttons */}
      {hasPendingChanges && (
        <div className="flex items-center gap-2 ml-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDraft}
            className="h-9"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={applyFilters}
            className="h-9"
          >
            <Check className="h-4 w-4 mr-1" />
            Aplicar
          </Button>
        </div>
      )}
    </div>
  );
}

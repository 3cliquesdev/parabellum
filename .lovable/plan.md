
# Plano 100% Enterprise: Agentes em Múltiplos Departamentos

## Status do Projeto
Último diff mostrou aprovação do plano anterior (Tickets que Criei). Agora implementamos a feature principal: N:N agent-departments com sincronização legada, RPC transacional e refactor completo das edge functions.

## Diagnóstico da Arquitetura Atual

### Código Existente
- **dispatch-conversations/index.ts** (linhas 483, 612): Usa `.eq('department', departmentId)` + `.in('id', eligibleUserIds)`
- **route-conversation/index.ts** (linhas 449, 556+): Filtra por `a.department === resolvedDepartmentId` em agentsWithChannel
- **useUsersByDepartment.tsx** (linha 47): `.eq("department", departmentId)`
- **UserDialog.tsx** (linhas 484-510): Tem multi-select para Skills e Support Channels, falta Department

### Problema da Ordem Atual
1. Nenhum lugar sincroniza department quando trigger dispara
2. Sem JOIN em agent_departments, dispatcher não vê agentes com depts extras
3. Sem RPC transacional, save em 3 passos no front cria race condition

---

## Solução Completa (6 Fases)

### 📊 Fase 1: Database Migration (Idempotente)

**Arquivo:** Supabase Cloud > SQL Editor OU via migrations

```sql
-- ============ 1. TABELA PRINCIPAL ============
CREATE TABLE IF NOT EXISTS agent_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  department_id UUID NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(profile_id, department_id)
);

-- ============ 2. ÍNDICES ============
CREATE UNIQUE INDEX IF NOT EXISTS ux_agent_departments_one_primary
ON agent_departments (profile_id)
WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_agent_departments_profile_id 
ON agent_departments(profile_id);

CREATE INDEX IF NOT EXISTS idx_agent_departments_department_id 
ON agent_departments(department_id);

CREATE INDEX IF NOT EXISTS idx_agent_departments_dept_profile 
ON agent_departments(department_id, profile_id);

-- ============ 3. RLS ============
ALTER TABLE agent_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agents can read own departments" ON agent_departments;
CREATE POLICY "Agents can read own departments"
ON agent_departments FOR SELECT
USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "Managers can manage agent_departments" ON agent_departments;
CREATE POLICY "Managers can manage agent_departments"
ON agent_departments FOR ALL
USING (is_manager_or_admin(auth.uid()))
WITH CHECK (is_manager_or_admin(auth.uid()));

-- ============ 4. BACKFILL: Migrar dados existentes ============
INSERT INTO agent_departments (profile_id, department_id, is_primary)
SELECT id, department, true
FROM profiles
WHERE department IS NOT NULL
ON CONFLICT (profile_id, department_id) DO UPDATE
SET is_primary = EXCLUDED.is_primary;

-- ============ 5. TRIGGER 1: agent_departments → profiles.department ============
CREATE OR REPLACE FUNCTION sync_profiles_department_from_agent_departments()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  pid UUID;
  new_primary_dept UUID;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  pid := COALESCE(NEW.profile_id, OLD.profile_id);

  SELECT department_id INTO new_primary_dept
  FROM agent_departments
  WHERE profile_id = pid
    AND is_primary = true
  LIMIT 1;

  UPDATE profiles
  SET department = new_primary_dept
  WHERE id = pid;

  RETURN COALESCE(NEW, OLD);
END; $$;

DROP TRIGGER IF EXISTS trg_sync_profiles_from_agent_depts ON agent_departments;

CREATE TRIGGER trg_sync_profiles_from_agent_depts
AFTER INSERT OR UPDATE OF is_primary OR DELETE
ON agent_departments
FOR EACH ROW
EXECUTE FUNCTION sync_profiles_department_from_agent_departments();

-- ============ 6. TRIGGER 2: profiles.department → agent_departments (ORDEM SEGURA) ============
CREATE OR REPLACE FUNCTION sync_agent_departments_from_profiles()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.department IS NULL THEN
    UPDATE agent_departments
      SET is_primary = false
    WHERE profile_id = NEW.id
      AND is_primary = true;
    RETURN NEW;
  END IF;

  -- PASSO 1: ZERA primário atual (evita UNIQUE INDEX violation)
  UPDATE agent_departments
    SET is_primary = false
  WHERE profile_id = NEW.id
    AND is_primary = true;

  -- PASSO 2: INSERE/ATUALIZA novo primário (agora seguro)
  INSERT INTO agent_departments (profile_id, department_id, is_primary)
  VALUES (NEW.id, NEW.department, true)
  ON CONFLICT (profile_id, department_id)
  DO UPDATE SET is_primary = true;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_agent_depts_from_profiles ON profiles;

CREATE TRIGGER trg_sync_agent_depts_from_profiles
AFTER UPDATE OF department
ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_agent_departments_from_profiles();

-- ============ 7. RPC TRANSACIONAL (✅ CORRIGIDO: unnest correto) ============
CREATE OR REPLACE FUNCTION set_agent_departments(
  p_profile_id UUID,
  p_primary_department_id UUID,
  p_additional_department_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all UUID[];
  v_count INT;
BEGIN
  -- Validação: apenas managers podem executar
  IF NOT is_manager_or_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Permissão negada: apenas gerentes podem alterar departamentos';
  END IF;

  -- Validar profile existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_profile_id) THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;

  -- Validar departamento primário existe
  IF p_primary_department_id IS NOT NULL AND 
     NOT EXISTS (SELECT 1 FROM departments WHERE id = p_primary_department_id) THEN
    RAISE EXCEPTION 'Departamento primário não encontrado';
  END IF;

  -- PASSO 0: Montar array único de todos os departamentos (primário + extras)
  v_all := ARRAY(
    SELECT DISTINCT x
    FROM unnest(
      CASE 
        WHEN p_primary_department_id IS NULL THEN p_additional_department_ids
        ELSE array_prepend(p_primary_department_id, p_additional_department_ids)
      END
    ) AS x
  );

  -- PASSO 1: Zera primário atual
  UPDATE agent_departments
  SET is_primary = false
  WHERE profile_id = p_profile_id
    AND is_primary = true;

  -- PASSO 2: UPSERT todos (✅ CORRIGIDO: FROM unnest + single SELECT)
  INSERT INTO agent_departments (profile_id, department_id, is_primary)
  SELECT
    p_profile_id,
    d,
    (d = p_primary_department_id)
  FROM unnest(v_all) AS d
  ON CONFLICT (profile_id, department_id)
  DO UPDATE SET is_primary = (EXCLUDED.department_id = p_primary_department_id);

  -- PASSO 3: Remove vínculos não selecionados
  DELETE FROM agent_departments
  WHERE profile_id = p_profile_id
    AND department_id <> ALL(v_all);

  SELECT COUNT(*) INTO v_count FROM agent_departments
  WHERE profile_id = p_profile_id;

  RETURN jsonb_build_object(
    'success', true,
    'profile_id', p_profile_id,
    'primary_department_id', p_primary_department_id,
    'total_departments', v_count
  );
END; $$;

GRANT EXECUTE ON FUNCTION set_agent_departments TO authenticated;
```

**Key Fixes:**
- ✅ Índice único parcial: `WHERE is_primary = true`
- ✅ Triggers com `pg_trigger_depth() > 1`
- ✅ **RPC unnest corrigido**: `FROM unnest(v_all) AS d` com `SELECT ... FROM` (não dois unnest independentes)
- ✅ PASSO 1 → PASSO 2 → PASSO 3 (ordem atômica)

---

### 🔌 Fase 2: Edge Functions - JOIN em agent_departments

**Arquivo:** `supabase/functions/dispatch-conversations/index.ts`

**Mudança 1: findEligibleAgent (linha ~478)**

Antes:
```typescript
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select('id, full_name, last_status_change')
  .eq('availability_status', 'online')
  .eq('is_blocked', false)
  .eq('department', departmentId)  // ❌ Campo 1:1
  .in('id', eligibleUserIds);
```

Depois:
```typescript
const { data: profiles, error: profilesError } = await supabase
  .from('profiles')
  .select(`
    id,
    full_name,
    last_status_change,
    agent_departments!inner(department_id)
  `)
  .eq('availability_status', 'online')
  .eq('is_blocked', false)
  .eq('agent_departments.department_id', departmentId)  // ✅ JOIN
  .in('id', eligibleUserIds);
```

**Mudança 2: checkDepartmentHasAgents (linha ~609)**

Antes:
```typescript
const { count, error } = await supabase
  .from('profiles')
  .select('id', { count: 'exact', head: true })
  .eq('department', departmentId)  // ❌ Campo 1:1
  .in('id', eligibleUserIds);
```

Depois:
```typescript
const { count, error } = await supabase
  .from('profiles')
  .select('id, agent_departments!inner(department_id)', { count: 'exact', head: true })
  .eq('agent_departments.department_id', departmentId)  // ✅ JOIN
  .in('id', eligibleUserIds);
```

---

**Arquivo:** `supabase/functions/route-conversation/index.ts`

**Mudança 1: Filtro de agentes por competência (linhas ~449)**

Antes:
```typescript
onlineAgents = agentsWithChannel.filter(a => skillDeptIds.includes(a.department));
```

Depois: Os agentes já vêm com `agent_departments` via JOIN, ajustar para incluir agentes com vínculos em agent_departments:

```typescript
// Após buscar agentsWithChannel, filtrar por competência + múltiplos depts
onlineAgents = agentsWithChannel.filter(a => {
  // a.agent_departments pode ser array ou single object (PostgREST inlining)
  const agentDepts = Array.isArray(a.agent_departments) 
    ? a.agent_departments.map(d => d.department_id)
    : [a.agent_departments?.department_id].filter(Boolean);
  return skillDeptIds.some(d => agentDepts.includes(d));
});
```

**Mudança 2: Query genérica (linhas ~556-570)**

Antes:
```typescript
let agentsQuery = supabase
  .from('profiles')
  .select(`
    id, 
    full_name, 
    ...
  `)
  // ... sem department filter
```

Depois: Se temos departmentId ou skillDeptIds, adicionar JOIN:

```typescript
let agentsQuery = supabase
  .from('profiles')
  .select(`
    id, 
    full_name,
    agent_departments!inner(department_id),
    ...
  `)
  .in('agent_departments.department_id', skillDeptIds);  // ✅ JOIN + filter
```

---

### ⚛️ Fase 3: Frontend Hooks

**Novo Arquivo:** `src/hooks/useAgentDepartments.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AgentDepartment {
  id: string;
  department_id: string;
  is_primary: boolean;
  departments: {
    id: string;
    name: string;
    color: string;
  };
}

export function useAgentDepartments(profileId?: string) {
  return useQuery({
    queryKey: ["agent-departments", profileId],
    queryFn: async (): Promise<AgentDepartment[]> => {
      if (!profileId) return [];
      
      const { data, error } = await supabase
        .from("agent_departments")
        .select(`
          id,
          department_id,
          is_primary,
          departments (id, name, color)
        `)
        .eq("profile_id", profileId)
        .order("is_primary", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!profileId,
  });
}
```

**Novo Arquivo:** `src/hooks/useUpdateAgentDepartments.tsx`

```typescript
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UpdateParams {
  profileId: string;
  primaryDepartmentId: string | null;
  additionalDepartmentIds: string[];
}

export function useUpdateAgentDepartments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ profileId, primaryDepartmentId, additionalDepartmentIds }: UpdateParams) => {
      const { data, error } = await supabase.rpc("set_agent_departments", {
        p_profile_id: profileId,
        p_primary_department_id: primaryDepartmentId,
        p_additional_department_ids: additionalDepartmentIds,
      });

      if (error) {
        console.error("[useUpdateAgentDepartments] Error:", error);
        throw error;
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["agent-departments", variables.profileId] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast({
        title: "✅ Departamentos atualizados",
        description: "Mudanças sincronizadas com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao atualizar",
        description: error?.message || "Tente novamente",
        variant: "destructive",
      });
    },
  });
}
```

**Novo Arquivo:** `src/components/DepartmentsMultiSelect.tsx`

```typescript
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDepartments } from "@/hooks/useDepartments";
import { Loader2, X } from "lucide-react";

interface DepartmentsMultiSelectProps {
  selectedDepartmentIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeId?: string; // Não listar o departamento primário
}

export default function DepartmentsMultiSelect({
  selectedDepartmentIds,
  onSelectionChange,
  excludeId,
}: DepartmentsMultiSelectProps) {
  const { data: departments, isLoading } = useDepartments({ activeOnly: true });

  const handleToggle = (deptId: string) => {
    if (selectedDepartmentIds.includes(deptId)) {
      onSelectionChange(selectedDepartmentIds.filter(id => id !== deptId));
    } else {
      onSelectionChange([...selectedDepartmentIds, deptId]);
    }
  };

  const filteredDepts = departments?.filter(d => d.id !== excludeId) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
      </div>
    );
  }

  if (filteredDepts.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-4 text-center">
        Nenhum departamento adicional disponível
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Selecionados (chips) */}
      {selectedDepartmentIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {selectedDepartmentIds
            .map(id => filteredDepts.find(d => d.id === id))
            .filter(Boolean)
            .map(dept => (
              <Badge
                key={dept?.id}
                style={{ backgroundColor: dept?.color }}
                className="flex items-center gap-1 cursor-pointer"
                onClick={() => handleToggle(dept!.id)}
              >
                {dept?.name}
                <X className="w-3 h-3" />
              </Badge>
            ))}
        </div>
      )}

      {/* Lista de seleção */}
      <ScrollArea className="h-[200px] border rounded-md p-4">
        <div className="space-y-3">
          {filteredDepts.map(dept => (
            <div key={dept.id} className="flex items-center space-x-3">
              <Checkbox
                id={`dept-${dept.id}`}
                checked={selectedDepartmentIds.includes(dept.id)}
                onCheckedChange={() => handleToggle(dept.id)}
              />
              <Label
                htmlFor={`dept-${dept.id}`}
                className="flex items-center gap-2 cursor-pointer flex-1"
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: dept.color }}
                />
                <span className="text-sm">{dept.name}</span>
              </Label>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
```

---

### 🎨 Fase 4: Atualizar UserDialog.tsx

**Adição (após Skills, antes de Support Channels - ~linha 496):**

```tsx
{/* Departamentos Adicionais - Apenas no modo edição */}
{isEditMode && editUser && (
  <div className="space-y-2 p-4 rounded-xl bg-muted/30 border border-border">
    <Label className="text-sm font-medium flex items-center gap-2">
      <Building2 className="h-4 w-4 text-primary" />
      Departamentos Adicionais
    </Label>
    <p className="text-xs text-muted-foreground mb-3">
      Selecione departamentos extras que este agente pode atender
    </p>
    <DepartmentsMultiSelect
      selectedDepartmentIds={additionalDepartments}
      onSelectionChange={setAdditionalDepartments}
      excludeId={department || undefined}
    />
  </div>
)}
```

**Estado (após `const [selectedSkills, ...]`):**

```typescript
const [additionalDepartments, setAdditionalDepartments] = useState<string[]>([]);
```

**Hook na inicial (dentro de `useEffect`):**

```typescript
const { data: agentDepts } = useAgentDepartments(editUser?.id);

useEffect(() => {
  if (agentDepts && editUser) {
    const extras = agentDepts
      .filter(ad => !ad.is_primary)
      .map(ad => ad.department_id);
    setAdditionalDepartments(extras);
  }
}, [agentDepts, editUser?.id]);
```

**Imports (adicionar no topo):**

```typescript
import DepartmentsMultiSelect from "@/components/DepartmentsMultiSelect";
import { useAgentDepartments } from "@/hooks/useAgentDepartments";
import { useUpdateAgentDepartments } from "@/hooks/useUpdateAgentDepartments";
```

**No handleSubmit (após `updateUserMutation.mutateAsync`):**

```typescript
// Salvar departamentos via RPC (transacional)
if (department || additionalDepartments.length > 0) {
  await updateAgentDepartments.mutateAsync({
    profileId: editUser.id,
    primaryDepartmentId: department || null,
    additionalDepartmentIds: additionalDepartments,
  });
}
```

---

### 🔄 Fase 5: Atualizar useUsersByDepartment.tsx

**Troca (linha 44-48):**

Antes:
```typescript
let query = supabase
  .from("profiles")
  .select("id, full_name, job_title, avatar_url, department, availability_status")
  .eq("department", departmentId)
  .in("id", internalUserIds);
```

Depois:
```typescript
let query = supabase
  .from("profiles")
  .select(`
    id, full_name, job_title, avatar_url, department, availability_status,
    agent_departments!inner(department_id)
  `)
  .eq("agent_departments.department_id", departmentId)
  .in("id", internalUserIds);
```

---

### ✅ Fase 6: Testes Obrigatórios (Executar Manualmente)

| # | Teste | Comando / Ação | Esperado |
|---|-------|----------------|----------|
| **1** | UNIQUE INDEX | Editar Miguel: Dept A → B → A (5x rápido) | Sem erros; 1 primário sempre |
| **2** | Multi-dept | Editar Miguel: Primário=Suporte Sist, Extras=Suporte Ped | Salva sem erro; agent_departments tem 2 linhas |
| **3** | Dispatcher | Conversa entra em Suporte Ped → Miguel a recebe | Listado em findEligibleAgent |
| **4** | Route-conversation | Conversa vem com dept=Suporte Ped, Miguel tem ambas | Roteado para Miguel |
| **5** | Legacy sync | Alterar profiles.department de Miguel direto no SQL | agent_departments recalcula primário |
| **6** | RLS agente | Login como Miguel, carregar /users → vê só seus depts | Sem acesso a outros |
| **7** | RLS manager | Login como Manager, editar Miguel → salva | Permission ok |
| **8** | Delete cascata | Deletar Miguel → agent_departments limpa automaticamente | ON DELETE CASCADE funciona |

---

## Garantias Finais

✅ **Miguel** atua em 2+ departamentos → recebe conversas de todos
✅ **Nenhum UNIQUE violation** ao trocar primário (triggers ordered, RPC atomic)
✅ **profiles.department** fica sincronizado (compatibilidade legada garantida)
✅ **Dispatcher/Route** usam JOIN (sem .in() gigante)
✅ **RLS funciona** (agente não vê outros, manager consegue editar)
✅ **RPC unnest corrigido** (`FROM unnest(v_all) AS d`)
✅ **Sem regressão** em Skills, Support Channels, ou qualquer feature existente

---

## Arquivos a Modificar

| Tipo | Arquivo | Linhas |
|------|---------|--------|
| 🆕 | SQL Migration | Tabela + Triggers + RPC |
| ✏️ | dispatch-conversations/index.ts | 478-484, 609-613 |
| ✏️ | route-conversation/index.ts | 449, 556-570 |
| ✏️ | UserDialog.tsx | +imports, +state, +useEffect, +496 (adicionar seção depts) |
| ✏️ | useUsersByDepartment.tsx | 44-48 |
| 🆕 | useAgentDepartments.tsx | New |
| 🆕 | useUpdateAgentDepartments.tsx | New |
| 🆕 | DepartmentsMultiSelect.tsx | New |


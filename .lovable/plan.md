
## Vincular Atendentes a Grupos (Estilo Octadesk)

### Contexto Atual

O sistema possui duas estruturas de grupos:

1. **Grupos de Entrega (`delivery_groups`)** - Focados em automações/playbooks para produtos
2. **Times (`teams`)** - Focados em organizar atendentes em grupos de atendimento

A funcionalidade de **Times** já existe e é a estrutura ideal para vincular atendentes a grupos, similar ao Octadesk. Porém, ela pode ser expandida para ter mais recursos.

---

### Proposta: Expandir a Funcionalidade de Times

Adicionar na pagina de **Times** a capacidade de:

1. **Vincular atendentes a multiplos grupos** (ja existe via `team_members`)
2. **Visualizar rapidamente os membros de cada grupo** (ja existe)
3. **Gerenciar canais de atendimento por grupo** (novo)
4. **Definir limite de atendimentos simultaneos por atendente** (novo)
5. **Configurar departamento padrao do grupo** (novo)

---

### Mudancas no Banco de Dados

**Nova tabela: `team_settings`**

```sql
CREATE TABLE public.team_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE UNIQUE,
  department_id UUID REFERENCES public.departments(id),
  max_concurrent_chats INTEGER DEFAULT 5,
  auto_assign BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Nova tabela: `team_channels`** (vincular times a canais de atendimento)

```sql
CREATE TABLE public.team_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES public.support_channels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(team_id, channel_id)
);
```

---

### Mudancas na Interface

**1. Pagina de Times (`src/pages/Teams.tsx`)**

Adicionar na visualizacao do card do time:
- Departamento vinculado (se houver)
- Canais de atendimento do time
- Configuracoes de distribuicao

**2. Novo Componente: `TeamSettingsDialog.tsx`**

Dialog para configurar:
- Departamento padrao do time
- Limite de atendimentos simultaneos
- Distribuicao automatica (on/off)
- Canais de atendimento vinculados

**3. Expandir `TeamMembersDialog.tsx`**

Adicionar visualizacao do status de disponibilidade de cada membro

---

### Fluxo de Uso

```text
Admin acessa Times
       |
       v
Cria novo time "Suporte Premium"
       |
       v
Configura:
  - Departamento: Suporte
  - Canais: WhatsApp, Chat Widget
  - Limite: 5 atendimentos/agente
       |
       v
Adiciona membros:
  - Joao Silva (Suporte)
  - Maria Costa (Suporte)
       |
       v
Sistema de routing usa team_channels
para direcionar conversas ao time correto
```

---

### Integracao com Routing

Atualizar `supabase/functions/route-conversation/index.ts` para:

1. Verificar se conversa veio de um canal especifico
2. Buscar times vinculados a esse canal (`team_channels`)
3. Priorizar agentes desses times na distribuicao

---

### Arquivos a Criar/Modificar

| Arquivo | Acao | Descricao |
|---------|------|-----------|
| Nova migration | Criar | Tabelas `team_settings` e `team_channels` |
| `src/hooks/useTeamSettings.tsx` | Criar | Hook para gerenciar configuracoes do time |
| `src/hooks/useTeamChannels.tsx` | Criar | Hook para gerenciar canais do time |
| `src/components/teams/TeamSettingsDialog.tsx` | Criar | Dialog de configuracoes avancadas |
| `src/pages/Teams.tsx` | Modificar | Adicionar botao de configuracoes e info extra |
| `src/components/teams/TeamCard.tsx` | Criar | Componente separado para o card do time |
| `supabase/functions/route-conversation/index.ts` | Modificar | Considerar `team_channels` no routing |

---

### Interface Final Esperada

Cada card de time mostrara:

```text
+------------------------------------------+
|  [S] Suporte Premium           [...]     |
|  Primeiro nivel de atendimento           |
+------------------------------------------+
|  Gestor: Joao Silva                      |
|                                          |
|  Departamento: Suporte                   |
|  Canais: WhatsApp, Chat                  |
|  Limite: 5 chats/agente                  |
|                                          |
|  👥 4 membros                   [+2+1]   |
|                                          |
|  [Gerenciar Membros]  [Configuracoes]    |
+------------------------------------------+
```

---

### Secao Tecnica: Codigo Principal

**Hook useTeamSettings:**

```typescript
export function useTeamSettings(teamId?: string) {
  return useQuery({
    queryKey: ["team-settings", teamId],
    queryFn: async () => {
      if (!teamId) return null;
      
      const { data, error } = await supabase
        .from("team_settings")
        .select(`
          *,
          department:departments(id, name, color)
        `)
        .eq("team_id", teamId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}
```

**Hook useTeamChannels:**

```typescript
export function useTeamChannels(teamId?: string) {
  return useQuery({
    queryKey: ["team-channels", teamId],
    queryFn: async () => {
      if (!teamId) return [];
      
      const { data, error } = await supabase
        .from("team_channels")
        .select(`
          *,
          channel:support_channels(id, name, color)
        `)
        .eq("team_id", teamId);

      if (error) throw error;
      return data;
    },
    enabled: !!teamId,
  });
}
```

**Integracao no route-conversation:**

```typescript
// Buscar times vinculados ao canal da conversa
const { data: teamChannels } = await supabaseClient
  .from("team_channels")
  .select("team_id")
  .eq("channel_id", channelId);

const teamIds = teamChannels?.map(tc => tc.team_id) || [];

// Buscar membros desses times
const { data: teamMembers } = await supabaseClient
  .from("team_members")
  .select("user_id")
  .in("team_id", teamIds);

// Priorizar esses agentes no routing
const priorityAgentIds = teamMembers?.map(tm => tm.user_id) || [];
```

---

### Beneficios

- Atendentes organizados por especialidade
- Routing inteligente baseado em canal + time
- Limite de atendimentos por agente
- Visibilidade clara de quem atende o que
- Similar ao modelo do Octadesk

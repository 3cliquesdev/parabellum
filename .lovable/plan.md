
# Plano Implementação: "Testar para Mim" com Tabela playbook_test_runs

## Contexto
Usuário quer executar playboos em ambiente real (com emails reais, delays acelerados) antes de ativar para clientes. Forneceu SQL da tabela `playbook_test_runs` e quer seguir com implementação.

## Arquivos a Criar/Modificar

### 1. **Tabela `playbook_test_runs`** (Migration SQL)

Será criada com:
- Campos: id, playbook_id, execution_id, started_by, tester_email, tester_name, speed_multiplier, status, flow_snapshot, created_at, updated_at
- Índices em: started_by, execution_id
- Relações: FK referências playbook_executions (ON DELETE CASCADE)

### 2. **Edge Function: `test-playbook/index.ts`** (NOVO)

Responsabilidade: Iniciar teste real
- Recebe: playbook_id (opcional), flow_definition, tester_email, tester_name, speed_multiplier
- Cria contato de teste com email do usuário (ou reutiliza se existir)
- Cria execution com `metadata.is_test_mode = true` e speed_multiplier
- Registra em playbook_test_runs
- Enfileira primeiro nó com flags `_test_mode=true` e `_speed_multiplier=10`
- Retorna: execution_id, test_contact_id, mensagem

Fluxo:
```
[POST /test-playbook] → {playbook_id?, flow_definition, tester_email, speed_multiplier}
  ↓
  Validar auth + flow_definition
  ↓
  Criar/reutilizar contato com email do user
  ↓
  Criar playbook_execution com is_test_mode=true
  ↓
  Inserir em playbook_test_runs (auditoria)
  ↓
  Enfileirar primeiro nó com _test_mode=true
  ↓
  Retorn success + execution_id
```

### 3. **Hook: `useTestPlaybook.tsx`** (NOVO)

Responsabilidade: Chamar edge function do frontend
- Mutation simples que chama `supabase.functions.invoke('test-playbook', {body})`
- On success: invalida queries, mostra toast
- On error: mostra erro
- Retorna: {mutate, isPending, isError}

### 4. **Edge Function: `process-playbook-queue/index.ts`** (MODIFICAÇÕES)

Três mudanças críticas:

#### A) No `executeDelayNode` (linhas 358-403)
**ANTES:**
```typescript
const seconds = convertDelayToSeconds(normalized.delay_type, normalized.delay_value);
const nextExecutionTime = new Date(Date.now() + seconds * 1000);
```

**DEPOIS:**
```typescript
let seconds = convertDelayToSeconds(normalized.delay_type, normalized.delay_value);

// 🧪 Modo teste: acelerar delay
const speedMultiplier = item.node_data?._speed_multiplier || 1;
const isTestMode = item.node_data?._test_mode === true;

if (isTestMode && speedMultiplier > 1) {
  const originalSeconds = seconds;
  seconds = Math.max(5, Math.floor(seconds / speedMultiplier));
  console.log(`[executeDelayNode] TEST MODE: Delay acelerado de ${originalSeconds}s para ${seconds}s (${speedMultiplier}x)`);
}

const nextExecutionTime = new Date(Date.now() + seconds * 1000);
```

#### B) No `executeDelayNode` - propagação de flags (linhas 377-388)
**ANTES:**
```typescript
await supabase
  .from('playbook_execution_queue')
  .insert({
    execution_id: execution.id,
    node_id: nextNode.id,
    node_type: nextNode.type,
    node_data: nextNode.data,
    scheduled_for: nextExecutionTime.toISOString(),
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
  });
```

**DEPOIS:**
```typescript
await supabase
  .from('playbook_execution_queue')
  .insert({
    execution_id: execution.id,
    node_id: nextNode.id,
    node_type: nextNode.type,
    node_data: {
      ...nextNode.data,
      _test_mode: item.node_data?._test_mode || false,
      _speed_multiplier: item.node_data?._speed_multiplier || 1,
    },
    scheduled_for: nextExecutionTime.toISOString(),
    status: 'pending',
    retry_count: 0,
    max_retries: 3,
  });
```

#### C) Em TODOS os `playbook_execution_queue.insert({...node_data: nextNode.data})` (linhas 381-388, 791-798, 942-949, 979-986)

Todos os 4 inserts precisam do mesmo override:
```typescript
node_data: {
  ...nextNode.data,
  _test_mode: item.node_data?._test_mode || false,
  _speed_multiplier: item.node_data?._speed_multiplier || 1,
}
```

**Justificativa:** Garantir que flags de teste se propagam por toda a execução, mesmo em nós de email, form, condition, switch.

### 5. **PlaybookEditor.tsx** (MODIFICAÇÕES)

#### A) Adicionar import
```typescript
import { useTestPlaybook } from "@/hooks/useTestPlaybook";
import { useAuth } from "@/hooks/useAuth"; // ou similar
```

#### B) Adicionar botão na toolbar (junto com Simular e Salvar)
Adicionar algo como:
```typescript
const testPlaybook = useTestPlaybook();
const { user } = useAuth();

<Button
  variant="outline"
  onClick={() => {
    if (!user?.email) {
      toast.error("Você precisa estar logado para testar");
      return;
    }
    testPlaybook.mutate({
      playbook_id: playbookId, // se já foi salvo
      flow_definition: { nodes, edges },
      tester_email: user.email,
      tester_name: user.user_metadata?.full_name || user.email.split('@')[0],
      speed_multiplier: 10,
    });
  }}
  disabled={testPlaybook.isPending || nodes.length === 0}
  className="gap-2"
>
  <FlaskConical className="h-4 w-4" />
  {testPlaybook.isPending ? "Testando..." : "🧪 Testar para Mim"}
</Button>
```

## Sequência de Implementação

1. ✅ Executar SQL para criar `playbook_test_runs` (via migration tool)
2. ✅ Criar `supabase/functions/test-playbook/index.ts`
3. ✅ Criar `src/hooks/useTestPlaybook.tsx`
4. ✅ Atualizar `process-playbook-queue/index.ts`:
   - Modificar `executeDelayNode` para aceitar/aplicar aceleração
   - Atualizar TODOS os 4 inserts na fila para propagar `_test_mode` e `_speed_multiplier`
5. ✅ Atualizar `PlaybookEditor.tsx` para adicionar botão "Testar para Mim"

## Garantias Enterprise

| # | Garantia | Implementação |
|---|----------|---------------|
| 1 | Sem poluição de dados | Contatos tagueados com `test_mode` |
| 2 | Emails reais enviados | Sistema de email funciona normalmente |
| 3 | Delays acelerados | Flag `_speed_multiplier` divide tempo |
| 4 | Propagação de flags | Cada nó subsequente herda `_test_mode` |
| 5 | Auditoria completa | Registra em `playbook_test_runs` |
| 6 | Sem regressão | Modo não-teste não afetado |

## Testes Obrigatórios (após implementação)

| # | Cenário | Validação |
|---|---------|-----------|
| 1 | Clicar "Testar para Mim" sem salvar | Funciona com flow_definition atual |
| 2 | Email de teste chega | Recebido no email do usuário logado |
| 3 | Delay 1 hora → 6 minutos | 10x aceleração funciona |
| 4 | Delay 5 minutos → 30s | Aceleração clamped a mínimo 5s |
| 5 | Email → Form → OK | Formulário link funciona no teste |
| 6 | Verificar playbook_test_runs | Registro de teste aparece |

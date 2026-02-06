
# Plano Implementação: "Testar para Mim" com Tabela playbook_test_runs

## ✅ Status: IMPLEMENTADO

## Contexto
Usuário quer executar playbooks em ambiente real (com emails reais, delays acelerados) antes de ativar para clientes.

## Arquivos Criados/Modificados

### 1. ✅ **Tabela `playbook_test_runs`** (Migration SQL)
- Criada com FK para `onboarding_playbooks` e `playbook_executions`
- Índices em: started_by, execution_id
- RLS policies configuradas

### 2. ✅ **Edge Function: `test-playbook/index.ts`**
- Recebe: playbook_id (opcional), flow_definition, tester_email, tester_name, speed_multiplier
- Cria/reutiliza contato com email do usuário
- Cria execution com `metadata.is_test_mode = true`
- Registra em `playbook_test_runs`
- Enfileira primeiro nó com `_test_mode=true` e `_speed_multiplier=10`

### 3. ✅ **Hook: `useTestPlaybook.tsx`**
- Mutation que chama edge function
- Toast de sucesso/erro
- Invalida queries relevantes

### 4. ✅ **Edge Function: `process-playbook-queue/index.ts`**
Modificações aplicadas:
- `executeDelayNode`: Acelera delays quando `_test_mode=true`
- Todos os 4 inserts de fila propagam `_test_mode` e `_speed_multiplier`

### 5. ✅ **PlaybookEditor.tsx**
- Botão "🧪 Testar para Mim" adicionado na toolbar
- Usa email do usuário logado
- Aceleração 10x por padrão

## Testes Sugeridos

| # | Cenário | Como Testar |
|---|---------|-------------|
| 1 | Clicar "Testar para Mim" | Abrir editor de playbook, criar fluxo, clicar no botão |
| 2 | Email de teste chega | Verificar inbox do email logado |
| 3 | Delays acelerados | Delay 1 hora → ~6 min (10x) |
| 4 | Verificar audit | Consultar tabela `playbook_test_runs` |


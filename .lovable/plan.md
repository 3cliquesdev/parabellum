

# Contrato do Modo Teste — Regras Travadas

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Objetivo

Criar um arquivo de contrato (`TEST_MODE_CONTRACT.md`) na raiz do projeto que documenta todas as regras do Modo Teste, servindo como referência imutável para evitar regressões futuras. Adicionalmente, atualizar a memory do projeto para refletir o contrato.

## Contrato proposto

O arquivo conterá as seguintes regras travadas:

---

### 1. Ativação (atômica)

- `TestModeDropdown.handleSelectFlow` faz uma operação atômica:
  - `is_test_mode = true`
  - `ai_mode = 'autopilot'`
  - Chama `process-chat-flow` com `manualTrigger: true`
- Nunca ativar `is_test_mode` sem resetar `ai_mode` para `autopilot`

### 2. Bypass de proteções

- **Kill Switch** (`ai_global_enabled = false`): Teste bypassa (linha 339)
- **ai_mode protection** (`waiting_human / copilot / disabled`): Teste bypassa (linha 371)
- Ambos os bypasses usam a mesma condição: `&& !isTestMode`

### 3. Fluxo ativo no teste

- Master Flow e triggers automáticos são bloqueados em teste
- Apenas o fluxo selecionado manualmente roda
- Separador visual "TESTE DE FLUXO INICIADO" é inserido
- Mensagens de teste têm highlight amarelo (`border-amber-400`)

### 4. ai_response (nó IA persistente)

- Anti-duplicação: janela de 5s para mesmo texto
- `exit_keyword` → limpa `__ai`, avança para próximo nó
- `max_interactions` → (opcional) envia `fallback_message` como `sender_type: 'system'`, limpa `__ai`, avança para próximo nó
- **Proibido**: hardcodar `waiting_human` ou completar flow state no max_interactions

### 5. Desativação

- Clique no botão amarelo → `is_test_mode = false`
- Não reseta `ai_mode` (mantém o estado atual)

### 6. Reativação

- Pode reativar a qualquer momento, independente do `ai_mode` atual
- A ativação atômica (regra 1) reseta tudo

---

## Arquivo a criar

| Arquivo | Ação |
|---|---|
| `TEST_MODE_CONTRACT.md` | Criar — contrato completo com as 6 regras acima |

## Impacto

Nenhuma mudança de código. Apenas documentação de referência para prevenir regressões.


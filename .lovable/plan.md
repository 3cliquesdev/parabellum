

# Desativar Shadow Mode (`ai_shadow_mode = false`)

## O que será feito

Atualizar o registro `ai_shadow_mode` na tabela `system_configurations` para `'false'`, garantindo que nenhuma função do sistema bloqueie envios automáticos da IA.

## Execução

1. **UPDATE** na tabela `system_configurations`: `SET value = 'false' WHERE key = 'ai_shadow_mode'`
2. **Verificar** que o valor foi salvo corretamente com uma query de leitura

## Impacto

- A IA passará a **executar ações** (enviar mensagens, aplicar mudanças) em vez de apenas sugerir
- Funções que verificam `ai_shadow_mode` (como `ai-autopilot-chat`) retornarão status `applied` em vez de `suggested_only`
- O `process-chat-flow` **não é afetado** (já não verifica Shadow Mode), mas outras edge functions que checam esse flag passarão a operar normalmente
- Nenhum downgrade — é a configuração necessária para operação normal do autopilot


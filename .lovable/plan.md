

# Auditoria Completa: Todos os Cenários de Transferência para Humano

## Mapeamento de Cenários

```text
Mensagem do Cliente
  └─ IA responde 24h ✅
       └─ Precisa transferir para humano?
            ├─ NÃO → IA continua normalmente ✅
            └─ SIM → checkAfterHoursAndIntercept()
                 ├─ FORA DO HORÁRIO → Envia msg template + fecha conversa ✅
                 └─ DENTRO DO HORÁRIO → transition-conversation-state (handoff_to_human)
                      └─ Cria dispatch job (status: pending)
                           └─ dispatch-conversations processa
                                ├─ CENÁRIO A: Agente online com capacidade → Atribui ✅
                                ├─ CENÁRIO B: Agentes online mas lotados → Retry (10s/20s/30s/60s) ✅
                                ├─ CENÁRIO C: Nenhum agente online → Retry até max_attempts ⚠️
                                │    └─ Após max_attempts → status "escalated"
                                │         ├─ Cria admin_alert ✅
                                │         └─ Conversa FICA PRESA em waiting_human + escalated
                                │              └─ requeueEscalatedJobs só resolve quando agente volta online
                                └─ CENÁRIO D: Departamento sem agentes configurados → manual_only ⚠️
```

## Problemas Identificados

### Problema 1: Cenário C — Cliente fica preso indefinidamente
Quando NENHUM agente está online dentro do horário comercial:
- O dispatch tenta várias vezes (retry com backoff)
- Após `max_attempts`, marca como "escalated"
- Gera `admin_alert`, mas **o cliente não recebe nenhuma comunicação**
- A conversa fica em `waiting_human` + `escalated` até um agente ficar online
- **O cliente não sabe que está esperando sem previsão**

### Problema 2: Cenário D — Departamento sem agentes
- Marca como `manual_only` e completa o job
- **O cliente também não recebe comunicação**

### Problema 3: Mensagem de fila só aparece no webhook
A mensagem "Nosso time não está disponível no momento" só é enviada quando o cliente manda uma NOVA mensagem enquanto está em `waiting_human`. Na transferência inicial (process-chat-flow), **nenhuma mensagem de "aguardando" é enviada** ao cliente.

---

## Plano de Correção

### Correção 1: Mensagem proativa na transferência inicial
No `process-chat-flow`, logo APÓS a chamada bem-sucedida ao `transition-conversation-state` (handoff_to_human), verificar se há agentes online no departamento. Se não houver, enviar mensagem proativa ao cliente:

```text
"⏳ Nosso time de atendimento está momentaneamente indisponível.
Assim que um especialista ficar online, você será atendido automaticamente. 🙏"
```

Se houver agentes online:
```text
"💬 Estou te conectando com um especialista. Aguarde um momento! 🙂"
```

**Onde:** Nos mesmos 14 pontos de transferência no `process-chat-flow`, APÓS o `checkAfterHoursAndIntercept` passar e APÓS o `fetch(transition-conversation-state)` ser feito com sucesso.

### Correção 2: Timeout de escalação com fallback inteligente
No `dispatch-conversations`, quando um job atinge status `escalated`, além do admin_alert, verificar novamente o horário comercial:
- **Se ainda dentro do horário:** manter em `escalated` (agentes podem estar em pausa/reunião, voltam em breve)
- **Se saiu do horário comercial durante a espera:** executar a mesma lógica de after-hours — enviar mensagem template + fechar conversa + aplicar tag

**Onde:** Na função `processEscalations()` do `dispatch-conversations`.

### Correção 3: Notificação periódica ao cliente em espera longa
No `dispatch-conversations`, quando um job em retry atinge 3+ tentativas sem sucesso, enviar uma mensagem de atualização ao cliente (com rate-limit de 5 minutos):

```text
"⏳ Ainda estamos procurando um especialista disponível. Você será atendido em breve!"
```

**Onde:** Na função `handleJobFailure()`, quando `newAttempts >= 3`.

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/process-chat-flow/index.ts` | Adicionar mensagem proativa pós-handoff (agentes online/offline) |
| `supabase/functions/dispatch-conversations/index.ts` | Verificar after-hours em `processEscalations()` + mensagem em espera longa |

**Resultado:** O cliente NUNCA fica sem comunicação, independente do cenário:
- Fora do horário → mensagem de horário + fecha ✅ (já implementado)
- Dentro do horário, agentes online → "Conectando com especialista" ✅ (novo)
- Dentro do horário, sem agentes → "Time indisponível, será atendido quando voltar" ✅ (novo)
- Espera longa → Atualização periódica ✅ (novo)
- Saiu do horário durante espera → Intercepta e fecha ✅ (novo)




# Plano: Adicionar CRON Nativo do Supabase para o Dispatcher

## Problema Atual

- O `dispatch-conversations` **não tem schedule** no `config.toml`
- O `cron-process-queue` também **não tem schedule nativo**
- A distribuição depende 100% de serviço externo (EasyCron, etc.)
- Se o serviço externo falhar, a fila para de andar

## Solução: CRON Nativo a Cada 1 Minuto

Escolhi a **Opção A (mais limpa)**: agendar o `dispatch-conversations` diretamente, removendo uma camada de indireção.

### Alteração 1: config.toml

Adicionar schedule nativo para o dispatcher:

```toml
[functions.dispatch-conversations]
verify_jwt = false

[functions.dispatch-conversations.cron]
schedule = "* * * * *"
region = "us-east-1"
```

**Por que `verify_jwt = false`?**
- O CRON nativo do Supabase chama a função internamente
- A função já valida chamadas via service_role_key
- Mesma configuração usada em outras funções CRON do projeto (ex: `check-inactive-users`, `redistribute-after-hours`)

### Validação de Segurança (já existente no código)

O `dispatch-conversations` já possui:

1. **Lock atômico ao pegar job** (linhas 88-94):
```typescript
.update({ status: 'processing' })
.eq('status', 'pending') // Só se ainda for pending
```

2. **Lock atômico ao atribuir conversa** (linhas 173-183):
```typescript
.is('assigned_to', null) // Only if still unassigned
```

Isso garante que mesmo rodando múltiplas vezes, não haverá duplicação.

## Arquitetura Final

```text
┌─────────────────────────────────────────────────────────────┐
│                     CRON Scheduler                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  dispatch-conversations (* * * * *)                  │   │
│  │  - Processa até 50 jobs por rodada                  │   │
│  │  - Lock atômico anti-duplicação                     │   │
│  │  - Retry com backoff exponencial                    │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  (Opcional) cron-process-queue via serviço externo         │
│  - Continua funcionando como redundância                   │
│  - Não conflita porque locks são atômicos                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Event Triggers                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Agente fica Online                                  │   │
│  │  → useAvailabilityStatus dispara dispatcher          │   │
│  │  → Distribuição instantânea (não espera CRON)       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Resultado Esperado

| Cenário | Comportamento |
|---------|---------------|
| Job pendente + agente online | Atribuído em até 60 segundos via CRON |
| Agente fica online | Atribuído em segundos via trigger D4 |
| Múltiplas execuções simultâneas | Lock atômico previne duplicação |
| Serviço externo falha | CRON nativo continua funcionando |

## Seção Técnica

### Arquivo Modificado

`supabase/config.toml` - Adicionar:

```toml
[functions.dispatch-conversations]
verify_jwt = false

[functions.dispatch-conversations.cron]
schedule = "* * * * *"
region = "us-east-1"
```

### Teste Após Deploy

1. Criar conversa em `waiting_human` sem `assigned_to`
2. Ter 1 agente online no departamento
3. Aguardar 1 minuto
4. Verificar se foi atribuída:
```sql
SELECT id, assigned_to, dispatch_status 
FROM conversations 
ORDER BY updated_at DESC 
LIMIT 5;
```


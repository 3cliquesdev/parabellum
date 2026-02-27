

# Acelerar cron do auto-close-conversations para 1 minuto

## Problema
O cron `auto-close-conversations` roda a cada **10 minutos** (`*/10 * * * *`). Timers de inatividade de 1-5 minutos configurados nos fluxos só disparam quando o cron roda, causando atraso de até +10 minutos.

## Solução
Alterar a frequência do cron de `*/10 * * * *` para `* * * * *` (a cada minuto).

### Arquivo: `supabase/config.toml`
- Mudar `schedule = "*/10 * * * *"` para `schedule = "* * * * *"` na seção `[functions.auto-close-conversations.cron]`

### Impacto
- Todas as 4 etapas (WhatsApp window, dept inactivity, AI inactivity, flow inactivity) rodam a cada minuto
- Timers de inatividade passam a ter precisão de ~1 minuto em vez de ~10 minutos
- Carga adicional mínima — as queries já são eficientes (filtram por threshold e retornam vazio rapidamente quando não há nada para processar)


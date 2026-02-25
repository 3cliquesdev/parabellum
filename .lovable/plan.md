

# Portal do Cliente — Diagnóstico e Plano

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Respostas às suas perguntas

### 1. Onde configuro o número do WhatsApp?

**Hoje: em lugar nenhum.** O número está **hardcoded** no código (`5511999999999`) em `src/pages/ClientPortal.tsx`, linha 42. Não existe nenhuma tela de configuração para alterar esse número sem mexer no código.

### 2. Como o cliente faz login?

O cliente acessa `/auth` (a mesma tela de login dos agentes). Após login, o sistema verifica o role do usuário na tabela `user_roles`. Se o role for `"user"`, ele é redirecionado para `/client-portal`. Ou seja, **o admin precisa criar a conta do cliente manualmente e atribuir o role "user"**.

---

## Problemas identificados

| Problema | Impacto |
|---|---|
| Número do WhatsApp hardcoded | Não configurável sem deploy |
| Sem tela de gestão do portal | Admin não tem onde personalizar |
| Login compartilha a mesma rota `/auth` dos agentes | Confuso para o cliente |

## Plano de melhoria

### Passo 1 — Tornar o número configurável via banco de dados

Usar a tabela `public_ticket_portal_config` que já existe (tem campos `name`, `description`, `is_active`). Adicionar uma coluna `whatsapp_number` (text, nullable) via migration.

### Passo 2 — Painel de configuração do portal (admin)

Na página de configurações do portal de tickets (onde já existe o toggle de ativar/desativar), adicionar campo editável para o número do WhatsApp. Assim o admin configura sem tocar em código.

### Passo 3 — Atualizar `ClientPortal.tsx`

Buscar o número da tabela `public_ticket_portal_config` em vez de usar o valor hardcoded. Se não houver número configurado, esconder o botão de WhatsApp.

### Passo 4 — (Opcional) Criar rota `/client-login` separada

Para evitar confusão, criar uma página de login dedicada ao cliente (`/client-login`) com visual mais simples, que só permite login (sem signup de admin). Redireciona para `/client-portal` após autenticação.

## Arquivos modificados/criados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar coluna `whatsapp_number` em `public_ticket_portal_config` |
| `src/pages/ClientPortal.tsx` | Buscar número do banco em vez de hardcoded |
| `src/hooks/usePublicTicketPortal.tsx` | Incluir `whatsapp_number` no tipo e query |
| Tela de config do portal (existente) | Adicionar campo editável para WhatsApp |

## Impacto
- Zero regressão: portal continua funcionando, só troca a fonte do número
- Upgrade: admin pode configurar o número sem deploy


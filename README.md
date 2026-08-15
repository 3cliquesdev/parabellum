# 3Cliques CRM

CRM SaaS multi-tenant com pipeline, inbox omnichannel, automações de IA, broadcasts e operação white-label para agências.

## Stack

- Next.js 16 e React 19
- TypeScript e Tailwind CSS 4
- Supabase Auth/Postgres/RLS
- Vertex AI, Meta/WhatsApp e Instagram
- Vitest e ESLint

## Configuração local

Requisitos: Node.js 24, npm e um projeto Supabase.

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

Preencha as variáveis de `.env.local`. Nunca exponha chaves `SUPABASE_SERVICE_ROLE_KEY`, credenciais Google ou segredos Meta com o prefixo `NEXT_PUBLIC_`.

O `INTERNAL_API_SECRET` precisa ser independente da chave service-role e ter pelo menos 32 caracteres. Um segredo pode ser gerado no PowerShell com:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

## Banco de dados

As migrations ficam em `supabase/migrations` e devem ser aplicadas em ordem. Antes de publicar esta versão, aplique especialmente `028_api_rate_limits.sql`; as rotas protegidas por limite de requisições falham de forma segura se a função ainda não existir.

Com a CLI do Supabase conectada ao projeto:

```bash
supabase db push
```

## Validação

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Modelo de segurança

- Rotas de negócio validam usuário, tenant e função no servidor.
- A impersonação de agência usa sessão opaca em cookie `httpOnly`, com expiração e revogação.
- Workers internos usam `INTERNAL_API_SECRET`; a chave service-role não funciona como segredo HTTP.
- Requisições para URLs fornecidas pelo usuário bloqueiam loopback, redes privadas, credenciais embutidas e redirecionamentos inseguros.
- Operações sensíveis e endpoints públicos de captação/IA têm rate limit persistente no Postgres.
- A service-role ignora RLS e deve existir apenas em código server-side, sempre acompanhada de autorização explícita.

## Deploy

1. Aplique todas as migrations.
2. Configure as variáveis de `.env.example` no ambiente de produção.
3. Execute a sequência completa de validação.
4. Publique a aplicação.
5. Faça um smoke test de login, troca de tenant, impersonação, inbox, IA, broadcast e webhooks.

Não publique antes de configurar `INTERNAL_API_SECRET`: workers e chamadas internas serão recusados intencionalmente.

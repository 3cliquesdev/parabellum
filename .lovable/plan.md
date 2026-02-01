

# Plano: Autonomia por Workspace (BYO Keys) + Instagram SaaS Global

## Visao Geral

Implementar arquitetura onde cada workspace configura suas proprias credenciais de integracoes (WhatsApp Meta, Email/Resend, Kiwify) de forma autonoma, com secrets criptografados AES-256-GCM e nunca expostos no client. O Instagram permanece como infraestrutura global do SaaS (apenas Super Admin configura App ID/Secret).

---

## Diagnostico Atual

```text
PROBLEMA ATUAL:
Settings (/settings e /settings/integrations)
├── InstagramSecretsCard ← SUPER ADMIN ONLY (ja tem check isAdmin)
├── KiwifyIntegrationCard ← Salva em system_configurations (NAO criptografado!)
├── SecretsConfigCard ← Lista secrets globais do Lovable Cloud
├── AIModelConfigCard ← Configuracoes de modelo AI
└── WebhooksConfigCard ← Configuracoes globais

Super Admin Panel (/super-admin)
├── SystemMetricsCard (metricas)
├── QuickUserManagement (usuarios)
├── PermissionsSummaryCard (resumo)
├── IntegrationStatusCard (status SOMENTE LEITURA)
├── RecentAuditLogs (logs)
└── DataManagementCard (limpeza)

PROBLEMAS:
1. Credenciais Kiwify salvas em system_configurations (nao criptografadas)
2. Nao existe conceito de "workspace" para credenciais - tudo eh global
3. Super Admin Panel nao tem gerenciamento real de credenciais
4. Nao ha Edge Functions padronizadas para set/get/test de integrações
5. Secrets sensíveis visiveis para usuarios com settings.integrations
```

---

## Arquitetura Proposta

### Separacao de Responsabilidades

```text
SUPER ADMIN (/super-admin) - Infraestrutura Global:
├── Instagram App ID/Secret/Verify Token (Meta Developer)
├── INTEGRATIONS_MASTER_KEY status (check se existe)
├── Webhooks globais (configuracao de infra)
└── Status geral de todas as integracoes

USUARIO/WORKSPACE (/settings/integrations) - BYO Keys:
├── WhatsApp Meta (WABA ID, Phone Number ID, Access Token)
├── Email/Resend (API Key, dominio, remetentes)
├── Kiwify (Client ID, Client Secret, Account ID)
└── Instagram (apenas OAuth connect/disconnect - sem ver secrets)
```

### Fluxo de Dados Seguro

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│  Edge Function  │────▶│  workspace_     │
│  (Input Form)   │     │ integrations-set│     │  integrations   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │                       ▼                       │
        │               ┌─────────────────┐             │
        │               │ AES-256-GCM     │             │
        │               │ Encryption      │             │
        │               │ (MASTER_KEY)    │             │
        │               └─────────────────┘             │
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Status Badge   │◀────│ integrations-   │◀────│ encrypted_      │
│  (Masked Data)  │     │ get             │     │ secrets         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

---

## Etapas de Implementacao

### 1. Database: Atualizar workspace_integrations

**Tabela ja existe**, precisa adicionar providers e ajustar RLS:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| workspace_id | UUID | ID do workspace (default para sistema atual) |
| provider | TEXT | whatsapp_meta, email_resend, kiwify, instagram |
| public_config | JSONB | Dados nao-sensiveis (nomes, dominio, etc) |
| encrypted_secrets | TEXT | Secrets criptografados AES-256-GCM |
| status | TEXT | active, inactive, error, not_configured |
| last_error | TEXT | Ultimo erro para debug |
| last_checked_at | TIMESTAMP | Ultima verificacao de status |

**RLS Policies:**
- Bloquear 100% acesso direto do client (SELECT/INSERT/UPDATE/DELETE)
- Acesso SOMENTE via Edge Functions com service role

### 2. Edge Functions: CRUD Seguro

#### 2.1 integrations-get (retorna dados mascarados)

```typescript
// Retorna:
{
  provider: "whatsapp_meta",
  public_config: { waba_name: "Minha Empresa" },
  secrets_masked: {
    access_token: "EAABw...••••••••",
    phone_number_id: "1234...••••"
  },
  status: "active",
  last_checked_at: "2026-02-01T10:00:00Z"
}
```

#### 2.2 integrations-set (salva com criptografia)

```typescript
// Recebe:
{
  provider: "whatsapp_meta",
  public_config: { waba_name: "Minha Empresa" },
  secrets: {
    waba_id: "12345678",
    phone_number_id: "98765432",
    access_token: "EAABw..."
  }
}
// Criptografa secrets com AES-256-GCM e salva
```

#### 2.3 integrations-test (valida credenciais)

```typescript
// Testa conexao real com API do provider
// WhatsApp: GET /v21.0/{phone_number_id}
// Email: GET https://api.resend.com/domains
// Kiwify: POST /oauth/token (validar credenciais)
// Retorna: { success: true/false, error?: string }
```

#### 2.4 integrations-reveal-secret (admin only, com auditoria)

```typescript
// Somente para roles elevadas (admin/manager)
// Loga em audit_logs antes de retornar
// Retorna apenas 1 campo por vez
```

### 3. UI: Central de Integracoes por Workspace

#### 3.1 Estrutura de Cards

```text
/settings/integrations (NOVA ESTRUTURA)
├── Secao: CANAIS DE COMUNICACAO
│   ├── InstagramIntegrationCard
│   │   └── Status + OAuth Connect/Disconnect (sem secrets)
│   └── WhatsAppMetaIntegrationCard
│       └── Form: WABA ID, Phone Number ID, Access Token
│       └── Botao: Testar Conexao
│
├── Secao: EMAIL
│   └── EmailResendIntegrationCard
│       └── Form: API Key, Dominio padrao
│       └── Botao: Testar Envio
│
└── Secao: E-COMMERCE
    └── KiwifyIntegrationCard (refatorar)
        └── Form: Client ID, Client Secret, Account ID
        └── Botao: Testar Autenticacao
```

#### 3.2 Componente Base: IntegrationCard

Todos os cards de integracao seguirao o mesmo padrao:

```tsx
interface IntegrationCardProps {
  provider: string;
  title: string;
  description: string;
  icon: LucideIcon;
  fields: FieldDefinition[];
  onTest: () => Promise<TestResult>;
}

// Features padrao:
// - Status badge (Configurado/Pendente/Erro)
// - Inputs com mascaramento de senha
// - Botao Salvar -> integrations-set
// - Botao Testar -> integrations-test
// - Logs de erro amigaveis
```

### 4. Super Admin Panel: Infraestrutura Global

#### 4.1 Nova Secao: Credenciais Globais

Adicionar ao SuperAdminPanel.tsx:

```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Visao Geral</TabsTrigger>
    <TabsTrigger value="credentials">Credenciais Globais</TabsTrigger>
    <TabsTrigger value="users">Usuarios</TabsTrigger>
  </TabsList>

  <TabsContent value="credentials">
    {/* Mover InstagramSecretsCard para ca */}
    <InstagramSecretsCard />
    
    {/* Status do INTEGRATIONS_MASTER_KEY */}
    <MasterKeyStatusCard />
    
    {/* Webhooks globais */}
    <GlobalWebhooksCard />
  </TabsContent>
</Tabs>
```

#### 4.2 Cards a Mover para Super Admin

| Card | De | Para |
|------|-----|------|
| InstagramSecretsCard | IntegrationsSettings | SuperAdminPanel |
| SecretsConfigCard (API Keys globais) | IntegrationsSettings | SuperAdminPanel |
| WebhooksConfigCard (config infra) | IntegrationsSettings | SuperAdminPanel |

### 5. Limpar Settings

#### 5.1 Remover de /settings

- Link "Instagram API" (credenciais) - fica em Super Admin
- Link "Central" que leva para credenciais sensiveis
- Qualquer referencia a App ID/Secret do Instagram

#### 5.2 Manter em /settings/integrations

- Cards de configuracao por workspace (WhatsApp, Email, Kiwify)
- Instagram OAuth (connect/disconnect apenas)

---

## Arquivos a Criar/Modificar

### Novos Arquivos

| Arquivo | Descricao |
|---------|-----------|
| `supabase/functions/integrations-get/index.ts` | Retorna integracao com secrets mascarados |
| `supabase/functions/integrations-set/index.ts` | Salva integracao com criptografia |
| `supabase/functions/integrations-test/index.ts` | Testa conexao de cada provider |
| `supabase/functions/integrations-reveal-secret/index.ts` | Revela 1 secret (admin only) |
| `src/components/integrations/WhatsAppMetaIntegrationCard.tsx` | Card para WhatsApp BYO |
| `src/components/integrations/EmailResendIntegrationCard.tsx` | Card para Email/Resend BYO |
| `src/components/integrations/IntegrationCardBase.tsx` | Componente base reutilizavel |
| `src/hooks/useWorkspaceIntegration.ts` | Hook para CRUD de integracoes |

### Arquivos a Modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/SuperAdminPanel.tsx` | Adicionar Tabs + cards de credenciais globais |
| `src/pages/IntegrationsSettings.tsx` | Remover cards sensiveis, manter apenas BYO workspace |
| `src/pages/Settings.tsx` | Remover links para credenciais sensiveis |
| `src/components/settings/KiwifyIntegrationCard.tsx` | Migrar para usar integrations-set (criptografado) |
| `src/components/settings/InstagramSecretsCard.tsx` | Mover para Super Admin apenas |
| `supabase/functions/integration-encrypt/index.ts` | Renomear para integrations-set |
| `supabase/functions/integration-decrypt/index.ts` | Usar internamente em integrations-get |

### Migracao SQL

```sql
-- Adicionar novos providers se necessario
ALTER TABLE workspace_integrations 
DROP CONSTRAINT IF EXISTS workspace_integrations_provider_check;

ALTER TABLE workspace_integrations 
ADD CONSTRAINT workspace_integrations_provider_check 
CHECK (provider IN ('instagram', 'whatsapp_meta', 'email_resend', 'kiwify'));

-- Garantir RLS bloqueando acesso direto
DROP POLICY IF EXISTS "Users can view own workspace integrations" ON workspace_integrations;
DROP POLICY IF EXISTS "Admins can manage all integrations" ON workspace_integrations;

-- NAO criar policies - acesso SOMENTE via Edge Functions
-- Isso garante que nenhum client acesse diretamente
```

---

## Criterios de Aceite

| Criterio | Validacao |
|----------|-----------|
| Cliente configura WhatsApp Meta sozinho | Form com WABA/Phone/Token + botao testar |
| Cliente configura Email/Resend sozinho | Form com API Key + botao testar |
| Cliente configura Kiwify sozinho | Form com Client ID/Secret/Account + botao testar |
| Secrets criptografados no banco | Verificar encrypted_secrets contem base64 |
| Secrets NAO acessiveis via query client | Testar query direta - deve falhar |
| Instagram OAuth funciona | Conectar conta sem ver App ID/Secret |
| Teste de integracao mostra erro amigavel | Testar com credenciais invalidas |
| Super Admin gerencia infra global | InstagramSecretsCard visivel apenas em /super-admin |

---

## Secrets Necessarios

### Ja Configurados (verificado)

- `FACEBOOK_APP_ID`
- `FACEBOOK_APP_SECRET`
- `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

### A Verificar/Adicionar

- `INTEGRATIONS_MASTER_KEY` - Chave AES-256 (32 bytes base64) para criptografia

---

## Impacto e Mitigacao

| Impacto | Mitigacao |
|---------|-----------|
| Credenciais Kiwify atuais em system_configurations | Migrar para workspace_integrations na primeira requisicao |
| Cards movidos para Super Admin | Adicionar redirect/mensagem para usuarios afetados |
| Edge functions existentes (integration-encrypt/decrypt) | Manter como fallback, criar novas com prefixo "integrations-" |

---

## Ordem de Execucao

1. **Database**: Ajustar RLS e constraints da workspace_integrations
2. **Edge Functions**: Criar integrations-get, integrations-set, integrations-test
3. **Hook**: Criar useWorkspaceIntegration para frontend
4. **Super Admin**: Adicionar Tabs e mover cards globais
5. **Settings**: Limpar links sensiveis e adicionar cards BYO
6. **Kiwify**: Migrar para usar novo padrao criptografado
7. **WhatsApp/Email**: Criar novos cards de configuracao
8. **Testes**: Validar todos os fluxos


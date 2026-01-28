
# Plano: Conectar Fontes de Dados à Persona e Corrigir check_tracking

## Diagnóstico Detalhado

### Problemas Identificados

| Problema | Causa | Impacto |
|----------|-------|---------|
| **check_tracking não funciona** | Ferramenta existe mas não é chamada corretamente pela IA ou MySQL não conecta | Cliente envia número do pedido → IA faz handoff ao invés de consultar |
| **Fontes de dados não mapeadas** | PersonaDialog tem 4 toggles genéricos, mas existem 5 fontes específicas na UI | Usuário não consegue controlar acesso granular |
| **Ferramentas built-in não filtradas** | `check_tracking` sempre disponível independente de `data_access` | IA tem acesso mas não sabe/não pode usar |

### Sua Configuração Atual (Persona Helper)

```
data_access: {
  customer_data: true,      ← Dados do Cliente
  knowledge_base: true,     ← Base de Conhecimento
  order_history: true,      ← Histórico de Pedidos (genérico)
  financial_data: true      ← Dados Financeiros
}
```

**O problema**: `order_history: true` deveria habilitar `check_tracking`, mas o código não faz essa validação.

---

## Solução

### FASE 1: Adicionar Controle de Rastreio no data_access

**Arquivo: `src/components/PersonaDialog.tsx`**

Adicionar novo toggle específico para rastreio:

```typescript
// Estado
const [accessTrackingData, setAccessTrackingData] = useState(false);

// No useEffect (linha ~70)
setAccessTrackingData(dataAccess?.tracking_data ?? false);

// No handleSubmit (linha ~102)
data_access: {
  customer_data: accessCustomerData,
  knowledge_base: accessKnowledgeBase,
  order_history: accessOrderHistory,
  financial_data: accessFinancialData,
  tracking_data: accessTrackingData,  // NOVO
},

// No JSX (após accessOrderHistory)
<div className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded border">
  <div>
    <Label htmlFor="accessTrackingData" className="font-medium">
      🚚 Rastreio de Pedidos (MySQL)
    </Label>
    <p className="text-xs text-muted-foreground">Consulta status de entrega no romaneio</p>
  </div>
  <Switch
    id="accessTrackingData"
    checked={accessTrackingData}
    onCheckedChange={setAccessTrackingData}
  />
</div>
```

### FASE 2: Filtrar Ferramentas Built-in por data_access

**Arquivo: `supabase/functions/ai-autopilot-chat/index.ts`**

Modificar a montagem de `allTools` (linha ~4494) para respeitar permissões:

```typescript
// Antes de montar allTools, definir quais ferramentas built-in estão permitidas
const canAccessTracking = personaDataAccess.tracking_data === true || personaDataAccess.order_history === true;
const canAccessFinancial = personaDataAccess.financial_data === true;
const canAccessCustomer = personaDataAccess.customer_data !== false;

// Ferramentas sempre disponíveis (core)
const coreTools = [
  // create_ticket - sempre disponível
  { type: 'function', function: { name: 'create_ticket', ... } },
  // verify_customer_email - sempre disponível (identificação)
  { type: 'function', function: { name: 'verify_customer_email', ... } },
  // verify_otp_code - sempre disponível
  { type: 'function', function: { name: 'verify_otp_code', ... } },
  // resend_otp - sempre disponível
  { type: 'function', function: { name: 'resend_otp', ... } },
  // request_human_agent - sempre disponível
  { type: 'function', function: { name: 'request_human_agent', ... } },
  // confirm_email_not_found - sempre disponível
  { type: 'function', function: { name: 'confirm_email_not_found', ... } },
];

// Ferramentas condicionais
const conditionalTools = [];

// check_tracking - só se tiver permissão de rastreio
if (canAccessTracking) {
  conditionalTools.push({
    type: 'function',
    function: {
      name: 'check_tracking',
      description: 'Consulta status de rastreio de pedidos no sistema de romaneio...',
      parameters: { ... }
    }
  });
  console.log('[ai-autopilot-chat] ✅ check_tracking HABILITADO (tracking_data ou order_history)');
} else {
  console.log('[ai-autopilot-chat] ❌ check_tracking DESABILITADO (sem permissão)');
}

// send_financial_otp - só se tiver permissão financeira
if (canAccessFinancial) {
  conditionalTools.push({
    type: 'function',
    function: { name: 'send_financial_otp', ... }
  });
}

const allTools = [
  ...coreTools,
  ...conditionalTools,
  ...enabledTools.map((tool: any) => ({
    type: 'function',
    function: tool.function_schema
  }))
];
```

### FASE 3: Melhorar Log e Diagnóstico do check_tracking

**Arquivo: `supabase/functions/ai-autopilot-chat/index.ts`**

Adicionar log detalhado quando `check_tracking` é chamado:

```typescript
else if (toolCall.function.name === 'check_tracking') {
  console.log('[ai-autopilot-chat] 🚚 CHECK_TRACKING INVOCADO');
  console.log('[ai-autopilot-chat] 🚚 Argumentos:', toolCall.function.arguments);
  
  try {
    const args = JSON.parse(toolCall.function.arguments);
    // ...código existente...
    
    // Log antes de chamar fetch-tracking
    console.log('[ai-autopilot-chat] 🔍 Chamando fetch-tracking com:', { 
      codes: codesToQuery,
      uncached: uncachedCodes.length 
    });
    
    const { data: fetchResult, error: fetchError } = await supabaseClient.functions.invoke('fetch-tracking', {
      body: { tracking_codes: uncachedCodes }
    });
    
    // Log resultado
    console.log('[ai-autopilot-chat] 🔍 fetch-tracking resultado:', {
      success: fetchResult?.success,
      found: fetchResult?.found,
      error: fetchError?.message
    });
```

### FASE 4: Verificar Credenciais MySQL

**Verificar se os secrets estão configurados:**

As credenciais necessárias para o `fetch-tracking` são:
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

Se não estiverem configuradas, a IA não consegue consultar o rastreio e faz handoff.

### FASE 5: Atualizar Widget de Fontes de Conhecimento

**Arquivo: `src/components/settings/PersonaDataAccessWidget.tsx`**

Adicionar a nova fonte de rastreio:

```typescript
const ACCESS_LABELS = [
  { key: "knowledge_base", label: "Base de Conhecimento", icon: BookOpen, color: "text-blue-500" },
  { key: "customer_data", label: "Dados de Clientes", icon: User, color: "text-green-500" },
  { key: "order_history", label: "Histórico de Pedidos", icon: Package, color: "text-purple-500" },
  { key: "tracking_data", label: "Rastreio Logístico", icon: Truck, color: "text-orange-500" },  // NOVO
  { key: "financial_data", label: "Dados Financeiros", icon: DollarSign, color: "text-amber-500" },
];
```

---

## Arquivos a Modificar

| Arquivo | Alteração | Prioridade |
|---------|-----------|------------|
| `supabase/functions/ai-autopilot-chat/index.ts` | Filtrar ferramentas por `data_access` | CRÍTICA |
| `supabase/functions/ai-autopilot-chat/index.ts` | Adicionar logs detalhados para `check_tracking` | ALTA |
| `src/components/PersonaDialog.tsx` | Adicionar toggle `tracking_data` | ALTA |
| `src/components/settings/PersonaDataAccessWidget.tsx` | Adicionar ícone/label de Rastreio | MÉDIA |
| `src/hooks/useUpdatePersona.tsx` | Incluir `tracking_data` no tipo | MÉDIA |

---

## Fluxo Após Correção

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ FLUXO CORRIGIDO - RASTREIO DE PEDIDOS                                        │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  CONFIGURAÇÃO DA PERSONA:                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ data_access: {                              │                             │
│  │   knowledge_base: true   ✅                 │                             │
│  │   customer_data: true    ✅                 │                             │
│  │   order_history: true    ✅                 │                             │
│  │   tracking_data: true    ✅ ← NOVO          │                             │
│  │   financial_data: true   ✅                 │                             │
│  │ }                                           │                             │
│  └─────────────────────────────────────────────┘                             │
│                                                                               │
│  Cliente: "16315521"                                                          │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 1. ai-autopilot-chat recebe mensagem        │                             │
│  │    → Verifica data_access.tracking_data     │                             │
│  │    → canAccessTracking = true               │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 2. Monta ferramentas disponíveis:           │                             │
│  │    ✅ create_ticket (sempre)                │                             │
│  │    ✅ verify_customer_email (sempre)        │                             │
│  │    ✅ check_tracking (tracking_data=true)   │ ← ANTES NÃO VERIFICAVA      │
│  │    ✅ send_financial_otp (financial=true)   │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 3. IA detecta código de pedido:             │                             │
│  │    → "16315521" parece número de pedido     │                             │
│  │    → Invoca check_tracking                  │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                             │
│  │ 4. check_tracking executa:                  │                             │
│  │    → Chama fetch-tracking com o código      │                             │
│  │    → Conecta MySQL (MYSQL_HOST, etc)        │                             │
│  │    → Busca na tabela parcel                 │                             │
│  └─────────────────────────────────────────────┘                             │
│         │                                                                     │
│         ├──── SE ENCONTRADO ────┐                                            │
│         │                       │                                            │
│         ▼                       ▼                                            │
│  ┌─────────────────┐    ┌──────────────────────┐                             │
│  │ "Seu pedido foi │    │ "Código 16315521     │                             │
│  │  embalado em    │    │  ainda não consta    │                             │
│  │  25/01 às 14:30"│    │  no romaneio..."     │                             │
│  └─────────────────┘    └──────────────────────┘                             │
│                                                                               │
│  ❌ SEM HANDOFF PREMATURO!                                                    │
│                                                                               │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## Verificação de Secrets MySQL

Antes de implementar, verificarei se os secrets MySQL estão configurados para garantir que o `fetch-tracking` pode conectar.

---

## Resultado Esperado

| Métrica | Antes | Depois |
|---------|-------|--------|
| Controle granular de rastreio | ❌ Não existe | ✅ `tracking_data` toggle na persona |
| Ferramentas filtradas por permissão | ❌ Sempre todas | ✅ Baseado em `data_access` |
| Log de diagnóstico | ❌ Mínimo | ✅ Detalhado para debug |
| Comportamento ao receber número | Handoff imediato | Consulta MySQL → responde status |

---

## Nota Técnica

O problema atual parece ser uma combinação de:
1. **Falta de filtro de ferramentas** - `check_tracking` existe mas não é controlado
2. **Possível erro na conexão MySQL** - Preciso verificar logs do `fetch-tracking`
3. **IA não reconhece código como rastreável** - "16315521" pode não parecer código de rastreio para a IA

A IA pode estar interpretando "16315521" como algo que não sabe lidar (não é BR..., não é email) e fazendo handoff por "caso complexo" ao invés de tentar `check_tracking`.

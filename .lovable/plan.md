

# Mover AI Telemetria para dentro do Dashboard

## O que muda

1. **`src/pages/Dashboard.tsx`** — Adicionar tab "AI Telemetria" (9a tab)
   - Importar o conteúdo do `AITelemetry.tsx` como componente
   - Adicionar `TabsTrigger` com icon `Activity` e valor `ai-telemetry`
   - Adicionar `TabsContent` renderizando o conteúdo da telemetria
   - Atualizar `useSearchParams` para suportar `?tab=ai-telemetry`

2. **`src/pages/AITelemetry.tsx`** — Extrair conteúdo + redirect
   - Extrair o conteúdo interno (sem PageContainer/PageHeader) para um componente exportado `AITelemetryContent`
   - O default export vira redirect: `<Navigate to="/?tab=ai-telemetry" replace />`

3. **`src/App.tsx`** — Substituir rota por redirect inline
   - Trocar a rota `/ai-telemetry` de lazy component para `<Navigate to="/?tab=ai-telemetry" replace />`

4. **`src/config/routes.ts`** — Remover "AI Telemetria" do sidebar
   - Remover o item `{ title: "AI Telemetria", href: "/ai-telemetry" }` do grupo "Automação & AI"

Tab order final: Overview | Vendas | Suporte | Financeiro | Operacional | Churn | Performance | Avançado | **AI Telemetria**


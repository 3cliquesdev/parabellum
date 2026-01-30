

# Plano: Sistema Robusto de Versionamento e Limpeza de Estado

## Contexto

O sistema atual já possui:
- **Service Worker cleanup** em `main.tsx` e `index.html`
- **Build ID** gerado por timestamp ISO no Vite
- **Banner de atualização** com verificação periódica

**Problema**: Falta um sistema de **versionamento semântico** que detecte mudanças críticas (fluxos, enums, contratos) e force limpeza automática de estado antigo para evitar bugs fantasmas.

---

## Arquitetura da Solução

```text
┌─────────────────────────────────────────────────────────────────┐
│                        FLOW DE INICIALIZAÇÃO                     │
├─────────────────────────────────────────────────────────────────┤
│  1. main.tsx (ANTES do React)                                    │
│     ├─ Lê APP_SCHEMA_VERSION (ex: "2026.01.30-v1")              │
│     ├─ Compara com localStorage.app_schema_version               │
│     ├─ Se diferente:                                             │
│     │   ├─ Preserva auth token do Supabase                       │
│     │   ├─ Limpa TODO localStorage/sessionStorage/IndexedDB      │
│     │   ├─ Restaura auth token                                   │
│     │   ├─ Salva nova versão                                     │
│     │   └─ Força reload                                          │
│     └─ Continua boot normal                                      │
│                                                                  │
│  2. App.tsx carrega                                              │
│     └─ UpdateAvailableBanner verifica BUILD_ID periódico        │
│                                                                  │
│  3. Se erro crítico detectado                                    │
│     └─ Modal não-técnico com botão "Atualizar agora"            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Mudanças Técnicas

### 1. Criar constante de versão de schema (`src/lib/build/schemaVersion.ts`)

Nova constante que você incrementa manualmente apenas em deploys críticos:

```typescript
/**
 * SCHEMA VERSION - Incrementar quando:
 * - Mudar estrutura de dados no localStorage/IndexedDB
 * - Alterar enums ou estados de fluxo
 * - Modificar contratos de API
 * - Refatorar lógica de distribuição
 * 
 * NÃO incrementar para mudanças de UI ou CSS
 */
export const APP_SCHEMA_VERSION = "2026.01.30-v1";
```

### 2. Adicionar validação de schema em `main.tsx`

Inserir **antes** da limpeza de Service Workers (linha ~16):

```typescript
import { APP_SCHEMA_VERSION } from "./lib/build/schemaVersion";

// ============================================
// SISTEMA DE VERSIONAMENTO DE SCHEMA
// ============================================

const SCHEMA_VERSION_KEY = 'app_schema_version';
const storedVersion = localStorage.getItem(SCHEMA_VERSION_KEY);

if (storedVersion !== APP_SCHEMA_VERSION) {
  console.warn('[Main] ⚠️ Schema version mismatch — resetting client state');
  console.warn('[Main] Stored:', storedVersion, '→ Current:', APP_SCHEMA_VERSION);
  
  // Preservar auth token do Supabase
  const supabaseAuthKey = Object.keys(localStorage).find(key => 
    key.startsWith('sb-') && key.endsWith('-auth-token')
  );
  const supabaseAuthValue = supabaseAuthKey ? localStorage.getItem(supabaseAuthKey) : null;
  
  // Limpar localStorage
  localStorage.clear();
  
  // Restaurar auth
  if (supabaseAuthKey && supabaseAuthValue) {
    localStorage.setItem(supabaseAuthKey, supabaseAuthValue);
  }
  
  // Salvar nova versão
  localStorage.setItem(SCHEMA_VERSION_KEY, APP_SCHEMA_VERSION);
  
  // Limpar sessionStorage
  sessionStorage.clear();
  
  // Limpar IndexedDB (assíncrono, mas não bloqueia)
  if ('indexedDB' in window && indexedDB.databases) {
    indexedDB.databases().then(dbs => {
      dbs.forEach(db => {
        if (db.name && !db.name.startsWith('sb-')) {
          indexedDB.deleteDatabase(db.name);
        }
      });
    });
  }
  
  // Reload único e controlado
  const reloadKey = 'app_schema_reload_done';
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, '1');
    window.location.reload();
  }
}
```

### 3. Melhorar `AppErrorBoundary.tsx` com modal não-técnico

Substituir a UI atual por um modal profissional:

```typescript
render() {
  if (this.state.hasError) {
    const handleForceUpdate = async () => {
      // Limpar tudo e recarregar
      const { hardRefresh } = await import('@/lib/build/ensureLatestBuild');
      await hardRefresh();
    };

    return (
      <div className="h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl">⚠️</div>
          <h1 className="text-2xl font-bold">Atualização importante</h1>
          <p className="text-muted-foreground">
            Detectamos que seu navegador está usando uma versão antiga do sistema.
            Para garantir o funcionamento correto, precisamos atualizar agora.
          </p>
          <button
            onClick={handleForceUpdate}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
          >
            Atualizar agora
          </button>
          {/* Detalhes técnicos escondidos para devs */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="text-left text-xs text-muted-foreground mt-4">
              <summary className="cursor-pointer">Detalhes técnicos</summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto">
                {this.state.error.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
  return this.props.children;
}
```

### 4. Refatorar `index.html` para simplificar script de SW

O script atual é bom, mas pode ser otimizado para evitar reload duplo:

```html
<script>
  (function () {
    try {
      if (!('serviceWorker' in navigator)) return;
      
      var hasController = !!navigator.serviceWorker.controller;
      var key = 'sw_clean_v2';  // Nova chave para evitar conflito
      
      // Limpar SW de forma assíncrona (não bloqueia carregamento)
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        return Promise.all(regs.map(function (r) { return r.unregister(); }));
      });
      
      // Reload apenas se estava sendo controlado por SW antigo e ainda não fez reload
      if (hasController && !sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        setTimeout(function() { location.reload(); }, 100);
      }
    } catch (e) {}
  })();
</script>
```

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| `src/lib/build/schemaVersion.ts` | **Criar** - Constante de versão de schema |
| `src/main.tsx` | **Modificar** - Adicionar validação de schema |
| `src/components/AppErrorBoundary.tsx` | **Modificar** - UI não-técnica com botão de atualização |
| `index.html` | **Modificar** - Otimizar script de SW cleanup |

---

## Uso Futuro

Quando você fizer um deploy crítico que mude estruturas de dados:

1. Abra `src/lib/build/schemaVersion.ts`
2. Incremente a versão: `"2026.01.30-v1"` → `"2026.01.31-v1"` (ou v2 no mesmo dia)
3. Deploy

Todos os usuários que abrirem o app terão seu estado resetado automaticamente.

---

## Impacto

- **Zero downgrade**: Usuários presos em versão antiga serão forçados a atualizar
- **Zero perda de sessão**: Auth token do Supabase é preservado
- **Zero interrupção**: Reload acontece apenas 1x por mudança de schema
- **UX profissional**: Modal limpo sem termos técnicos


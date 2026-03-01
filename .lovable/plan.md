

# Remover código PWA/Service Worker do projeto

## O que será removido

### 1. `index.html` — Bloco "PWA NUKER" (linhas 42-68)
Remover o script inteiro que desregistra SWs e limpa CacheStorage, incluindo o comentário "Theme Color removido - evita PWA-lite".

### 2. `src/main.tsx` — Bloco "Remove service workers residuais" (linhas 99-105)
Remover o trecho que chama `navigator.serviceWorker.getRegistrations()` e desregistra workers.

### 3. `src/lib/build/ensureLatestBuild.ts` — Limpar referências a SW dentro de `clearAllCaches()`
Remover o bloco que desregistra service workers (linhas 94-103). Manter limpeza de CacheStorage e IndexedDB pois são úteis para build updates. Atualizar comentários que mencionam "PWA".

### 4. `package.json` — Remover dependências
- `vite-plugin-pwa`
- `workbox-window`

### 5. `src/components/UpdateAvailableBanner.tsx`
Nenhuma mudança — não tem código PWA, apenas usa `checkForUpdate`/`forceUpdate` que permanecem.

## O que NÃO será afetado
- Sistema de build versioning (continua funcionando)
- `ensureLatestBuild` / `forceUpdate` / `checkForUpdate` (permanecem)
- Schema versioning em `main.tsx` (permanece)
- Chunk error handlers (permanecem)


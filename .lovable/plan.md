

# Diagnóstico: Consultora Daniela vê versão antiga mesmo com Ctrl+Shift+R

## Causa Provável

O `index.html` publicado está sendo cacheado pelo CDN. O Vite já gera nomes de chunks com hash (ex: `vendor-react.abc123.js`), então os JS/CSS são sempre únicos por build. Porém, se o **HTML** em si estiver cacheado, ele aponta para os chunks antigos.

O sistema `ensureLatestBuild` existente detecta nova versão mas **não faz reload automático** (desativado intencionalmente na linha 312-314). Ou seja, mesmo que detecte versão nova, não atualiza.

## Solução

### 1. Ativar notificação de atualização obrigatória
- No `ensureLatestBuild.ts`, quando detectar versão diferente, disparar um **toast persistente** com botão "Atualizar agora" que chama `forceUpdate()`
- Isso garante que qualquer usuário veja a notificação e possa atualizar com 1 clique

### 2. Auto-update na navegação entre páginas
- No `App.tsx` (ou layout principal), adicionar listener de `popstate` / route change que chama `checkForUpdate()` 
- Se houver update disponível, mostrar o toast
- Assim, ao navegar entre páginas, o sistema verifica e notifica

### 3. Verificação periódica silenciosa (a cada 5 minutos)
- `setInterval` no layout principal que chama `checkForUpdate()`
- Se retornar `true`, mostra toast com botão de atualizar

### Arquivos editados
- `src/lib/build/ensureLatestBuild.ts` — exportar função `showUpdateToast()`
- `src/App.tsx` ou layout principal — adicionar verificação periódica + toast de atualização
- Sem mudanças no banco

### Ação imediata para a Daniela
- Pedir para ela acessar **Configurações → Manutenção → Limpar Cache** (botão já existe no `SystemMaintenanceCard`)
- Ou acessar o link publicado com `?_force=1` no final da URL


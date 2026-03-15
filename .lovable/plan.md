
Objetivo: eliminar definitivamente os cards pretos no `/client-portal` sem mexer no header gradiente e sem alterar lógica.

Diagnóstico (com base no código + preview real):
- O `ClientPortal.tsx` já está entregando `bg-white`/`bg-gray-50` no runtime.
- Mesmo assim, no preview os cards continuam pretos.
- Do I know what the issue is? **Sim**: não é mais problema de JSX/classes ausentes; é conflito de tema/cascade no CSS global (dark ativo) que ainda está vencendo visualmente em partes da página.

Plano de correção (implementação):
1) Isolar tema claro por rota com classe no `html` (mais forte que wrapper local)
- Arquivo: `src/pages/ClientPortal.tsx`
- Adicionar `useEffect` para:
  - `document.documentElement.classList.add("client-portal-force-light")` no mount
  - remover no unmount
- Remover dependência do wrapper `className="light"` (que não está sendo suficiente).

2) Criar override CSS específico do portal com alta prioridade
- Arquivo: `src/index.css`
- Remover o bloco genérico atual `.light, .light * { ... }` (escopo amplo e pouco previsível).
- Adicionar bloco novo, escopado e explícito:
  - `html.client-portal-force-light` + `body` + `#root` com fundo claro.
  - classes utilitárias do portal (ex.: `.client-portal-card`, `.client-portal-tabbar`, `.client-portal-text`, `.client-portal-muted`) com `background-color`, `color`, `border-color` explícitos.
  - usar `!important` apenas nesses seletores escopados para neutralizar o dark global sem quebrar o resto do app.

3) Marcar os blocos críticos com classes escopadas
- Arquivo: `src/pages/ClientPortal.tsx`
- Aplicar classes novas aos 3 pontos que hoje ficam pretos:
  - card das abas
  - card de conteúdo
  - botão de WhatsApp (outline usa `bg-background` internamente)
- Exemplo de direção:
  - `client-portal-tabbar` no container das abas
  - `client-portal-card` no conteúdo principal
  - `client-portal-whatsapp-btn` no botão.

4) Blindar lista de devoluções (consistência visual)
- Arquivo: `src/components/client-portal/ReturnsList.tsx`
- Manter classes explícitas já usadas e adicionar classe escopada (`client-portal-card`) nos cards da lista para garantir que não voltem ao preto em tema dark global.

5) Validação final visual
- Conferir no `/client-portal`:
  - fundo da página = `bg-gray-50` claro
  - cards = branco com borda cinza clara
  - header gradiente intacto
  - abas intactas
  - “Sair da conta” discreto no rodapé
- Testar também troca de aba para garantir que nenhum estado re-renderiza para preto.

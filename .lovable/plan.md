

# Fix: Cards pretos no Client Portal

## Problema
A classe `light` no div não sobrescreve as variáveis CSS do tema escuro definidas no `<html class="dark">`. As classes semânticas (`text-muted-foreground`, `text-foreground`, `border-border`, `bg-accent`) continuam resolvendo para cores escuras.

## Solução
Substituir **todas** as classes semânticas de cor por cores explícitas em `ClientPortal.tsx` e garantir que `ReturnsList.tsx` também use cores explícitas.

### `src/pages/ClientPortal.tsx`
| Classe semântica | Substituir por |
|---|---|
| `text-muted-foreground` | `text-gray-500` |
| `text-foreground` | `text-gray-900` |
| `border-border` | `border-gray-200` |
| `hover:bg-accent/50` | `hover:bg-gray-100` |
| `hover:text-foreground` | `hover:text-gray-900` |

### `src/components/client-portal/ReturnsList.tsx`
| Classe semântica | Substituir por |
|---|---|
| `text-muted-foreground` | `text-gray-500` |
| `text-foreground` | `text-gray-900` |
| `border-border/60` | `border-gray-200` |
| `bg-card` | `bg-white` |
| `bg-primary/10` | `bg-blue-50` |
| `text-primary` | `text-blue-600` |
| `text-muted-foreground/40` | `text-gray-400` |
| `text-muted-foreground/70` | `text-gray-400` |

Nenhuma mudança de lógica — apenas substituição de classes CSS.




# Auditoria do Master Flow — Resultados

## Estrutura: 33 nós, 43 arestas

---

## PROBLEMAS ENCONTRADOS

### 1. NÓ ÓRFÃO: `welcome_ia` (Boas-vindas IA) e `ia_entrada` (IA Suporte)

O nó `start` conecta diretamente ao nó **Condição** (`1769459229369`), mas os nós `welcome_ia` e `ia_entrada` **não têm nenhuma aresta de entrada vinda do start**. Eles formam uma ilha isolada:

```text
start ──→ Condição (keywords)       ← CAMINHO REAL
                                     
welcome_ia ──→ ia_entrada ──→ Inatividade 6min   ← DESCONECTADO!
```

A IA de entrada **nunca é atingida** pelo fluxo normal. O motor pode usar fallback, mas no grafo visual está quebrado.

**Correção:** Conectar `start → welcome_ia` e mover a edge que hoje vai para Condição para sair do `ia_entrada` (via ai_exit) ou inserir welcome_ia na cadeia.

---

### 2. ARESTA FALTANTE: Inatividade 6min (`1772133662928`) — sem caminho "false"

Após a IA de entrada, o fluxo chega na condição de inatividade de 6 minutos. Ela tem:
- **true** (inativo) → Nó End ✓
- **false** (usuário respondeu) → **NENHUM DESTINO** ✗

Se o usuário responde após a IA, o fluxo não sabe para onde ir.

**Correção:** Adicionar edge `false` apontando para o nó desejado (ex: de volta à IA ou para o Menu).

---

### 3. ARESTA FALTANTE: Inatividade 1min (`1772196913050`) — sem caminho "false"

Nós de "Trava" do caminho Não-Cliente (Drop Nacional/Internacional/Hibrido/Clube) convergem nessa condição de inatividade 1min. Ela tem:
- **true** (inativo) → Mensagem "Responda!" → Inatividade 4min → Transfer/End ✓
- **false** (usuário respondeu a tempo) → **NENHUM DESTINO** ✗

O usuário responde à "Trava" e o fluxo trava.

**Correção:** Adicionar edge `false` apontando para o nó de transfer Comercial (`1769460592402`) ou equivalente.

---

## SEM PROBLEMAS (Caminhos completos)

| Caminho | Status |
|---|---|
| Condição → Onboarding → Email → Validar → Consultor? → Sim → Transfer CS | ✓ OK |
| Condição → Onboarding → Email → Validar → Consultor? → Não → Alerta → Menu | ✓ OK |
| Condição → Carnaval → Transfer Comercial | ✓ OK |
| Condição → Comercial → Transfer Comercial | ✓ OK |
| Condição → Else → Menu Sim/Não → Sim → Produto → Suporte Menu → Pedidos/Sistema/Acesso/Outros → Trava → Inatividade → Transfer/End | ✓ OK |
| Menu Não → Produto → Trava → Inatividade 1 → Msg → Inatividade 4 → Transfer/End | ✓ OK (exceto false do inactivity 1) |
| Todos os nós transfer/end são terminais | ✓ OK |

---

## RESUMO

| Tipo | Qtd | Detalhe |
|---|---|---|
| Nós órfãos | 2 | `welcome_ia`, `ia_entrada` (desconectados do start) |
| Edges false faltantes | 2 | Inatividade 6min e Inatividade 1min |
| Nós sem destino (dead-end) | 0 | Todos terminam em transfer ou end |
| Nós não alcançáveis | 2 | Os mesmos órfãos acima |

---

## PLANO DE CORREÇÃO

1. **Reconectar IA ao fluxo:** Redirecionar `start → welcome_ia` e conectar o caminho de saída da IA (`ai_exit`) ao nó Condição para manter o roteamento por keywords
2. **Adicionar edge false na Inatividade 6min:** Conectar ao nó Condição ou Menu (quando o usuário responde após a IA)
3. **Adicionar edge false na Inatividade 1min:** Conectar ao nó de transfer Comercial (quando o usuário responde à "Trava")

Todas as correções são feitas diretamente no editor visual (adicionando 3 edges). Nenhuma mudança de código necessária.


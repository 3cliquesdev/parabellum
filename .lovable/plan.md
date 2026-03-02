

# Fix: Atribuir Eliane Freitas ao Consultor Luiz Henrique

## Situação Atual

| Campo | Valor Atual | Valor Correto |
|---|---|---|
| `consultant_id` | Loriani (vendedora) `522d898d` | **Luiz Henrique** (consultor) `d76a5406` |
| `assigned_to` | Loriani `522d898d` | **Luiz Henrique** `d76a5406` |
| Conversa `395cd646` `assigned_to` | Loriani `522d898d` | **Luiz Henrique** `d76a5406` |

**Luiz Henrique** tem 900 clientes (menor carga entre os 3 consultores ativos).

## O que será feito

### 1. Criar edge function `admin-fix-contact`
Uma função administrativa simples que:
- Atualiza `consultant_id` e `assigned_to` do contato para o novo consultor
- Reatribui conversas abertas desse contato ao novo consultor
- Registra a mudança no histórico de interações

### 2. Executar a correção
Chamar a função para corrigir a Eliane:
- Contact: `3baa1726` → `consultant_id` = Luiz Henrique (`d76a5406`)
- Conversa: `395cd646` → `assigned_to` = Luiz Henrique, `ai_mode` = `copilot`

### 3. Remover a função após uso
A edge function é temporária — será removida após a correção.

## Nota sobre o trigger existente
O trigger `sync_assigned_to_consultant_id` está correto: só preenche `consultant_id` quando está `NULL`. Ele **não** deve sobrescrever automaticamente quando já tem valor, porque são campos com propósitos diferentes (`assigned_to` = quem atende agora, `consultant_id` = quem é o dono do cliente).


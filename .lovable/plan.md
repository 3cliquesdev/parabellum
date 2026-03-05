

# Plano: Upgrade do Trigger de Validação (Hardening)

## O que muda

O usuário enviou uma versão melhorada do SQL já executado na migration anterior. As diferenças são:

| Aspecto | Versão atual | Versão nova |
|---|---|---|
| Volatilidade | `STABLE` (incorreto para trigger) | `VOLATILE` (correto) |
| Erro | `RAISE EXCEPTION 'msg'` | `RAISE EXCEPTION USING ERRCODE='23514', MESSAGE='msg'` (check_violation) |
| Trim | `trim()` | `btrim()` (explícito) |
| Segurança | Sem revoke | `REVOKE ALL FROM PUBLIC` |
| Idempotência | Sem drop prévio do trigger deals | `DROP TRIGGER IF EXISTS` antes de criar |

## Implementação

Uma única migration SQL que:
1. Recria o trigger `updated_at` em `sales_channels` (idempotente, mesmo resultado)
2. Substitui a função `validate_deal_sales_channel` com `CREATE OR REPLACE` (VOLATILE + ERRCODE + btrim + REVOKE)
3. Recria o trigger em `deals` com DROP IF EXISTS + CREATE

Nenhuma alteração de código frontend necessária.


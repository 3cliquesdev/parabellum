

# Plano: Trigger de Validação no Postgres + Reuso de `update_updated_at_column()`

## Contexto

Dois ajustes pendentes identificados na auditoria:

1. **Trigger `updated_at` em `sales_channels`** criou uma função redundante (`update_sales_channels_updated_at`). O projeto já tem `public.update_updated_at_column()` usada em 20+ tabelas. Devemos reusar.

2. **Validação `requires_order_id` só existe no frontend** (dialog + re-check no handler). Um `UPDATE` direto via API/client bypassa. Precisamos de um trigger no Postgres na tabela `deals`.

## Alterações

### 1. Migration SQL

```sql
-- A) Remover trigger/função redundante e reusar a padrão
DROP TRIGGER IF EXISTS trg_sales_channels_updated_at ON public.sales_channels;
DROP FUNCTION IF EXISTS public.update_sales_channels_updated_at();

CREATE TRIGGER update_sales_channels_updated_at
  BEFORE UPDATE ON public.sales_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- B) Trigger de validação: deals.external_order_id obrigatório quando canal exige
CREATE OR REPLACE FUNCTION public.validate_deal_sales_channel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.sales_channel_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.sales_channels
      WHERE id = NEW.sales_channel_id AND requires_order_id = true
    ) AND (NEW.external_order_id IS NULL OR trim(NEW.external_order_id) = '') THEN
      RAISE EXCEPTION 'O canal de venda selecionado exige um ID de venda (external_order_id)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_validate_deal_sales_channel
  BEFORE INSERT OR UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_deal_sales_channel();
```

### 2. Nenhuma alteração de código frontend

A validação frontend continua como está (UX). O trigger é a camada de segurança real que impede bypass.

## Arquivos

| Arquivo | Acao |
|---|---|
| Migration SQL | Reusar trigger updated_at + criar trigger validacao deals |

## Resultado

- `updated_at` em `sales_channels` usa a mesma função padrao do projeto
- Tentar salvar deal com FForder (requires_order_id=true) sem external_order_id falha no banco, independente de como o request chegou


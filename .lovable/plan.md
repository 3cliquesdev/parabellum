

# Plano Atualizado: Limpeza do Pipeline Comercial (Vendas - Nacional)

## Objetivo

Separar o pipeline "Vendas - Nacional" para conter APENAS deals que o time comercial realmente trabalha:
- Recuperacoes / Winbacks
- Carrinhos abandonados / Cartoes recusados
- Formularios (leads que precisam de atendimento)
- Qualquer deal com vendedor atribuido

Deals automaticos (organicos via checkout direto, afiliados, recorrencias) serao movidos para os pipelines de Customer Success.

---

## Criterios de Classificacao ATUALIZADOS

### Ficam no Comercial (para o time fechar)

| Criterio | Logica |
|----------|--------|
| Tem vendedor | `assigned_to IS NOT NULL` |
| Recuperacao/Winback | titulo LIKE `%recupera%`, `%winback%` |
| Carrinho/Cartao | titulo LIKE `%carrinho%`, `%cartao%`, `%recusado%` |
| Formulario | `lead_source IN ('formulario', 'form', 'chat_widget', 'webchat')` |

### Vai para CS - Recorrencia

```text
lead_source IN ('kiwify_recorrencia', 'kiwify_renovacao')
```

### Vai para CS - Novos Clientes

```text
Tudo que sobrar:
- assigned_to IS NULL
- NAO e recuperacao/winback/carrinho
- NAO e formulario
- NAO e recorrencia
(vendas organicas/afiliados via checkout automatico)
```

---

## Numeros Estimados da Migracao

| Destino | Quantidade Estimada | Conteudo |
|---------|---------------------|----------|
| MANTER em Vendas - Nacional | ~2.500 | Recuperacoes + Winbacks + Formularios + Com vendedor |
| MOVER para CS - Novos Clientes | ~5.000 | Vendas organicas/afiliados automaticas |
| MOVER para CS - Recorrencia | ~1.647 | Renovacoes/recorrencias automaticas |

---

## Implementacao SQL

### Etapa 1: Criar Stage "Entrada" no CS - Recorrencia

```sql
INSERT INTO stages (id, name, position, pipeline_id, probability)
VALUES (
  gen_random_uuid(),
  'Entrada',
  0,
  '468a3d8c-fffc-44a5-a7b8-f788906dd492',
  0
);
```

### Etapa 2: Migrar RECORRENCIAS para CS - Recorrencia

```sql
UPDATE deals
SET 
  pipeline_id = '468a3d8c-fffc-44a5-a7b8-f788906dd492',
  stage_id = CASE 
    WHEN status = 'won' THEN '7e495f70-8435-4fcd-bf4d-3ea4d41b74bb'
    ELSE (SELECT id FROM stages WHERE pipeline_id = '468a3d8c-fffc-44a5-a7b8-f788906dd492' AND name = 'Entrada')
  END,
  updated_at = now()
WHERE pipeline_id = 'a272c23a-bcd8-411c-bbc1-706c2aa95055'
  AND lower(lead_source) IN ('kiwify_recorrencia', 'kiwify_renovacao');
```

### Etapa 3: Migrar ORGANICOS/AFILIADOS para CS - Novos Clientes

```sql
UPDATE deals
SET 
  pipeline_id = 'a7599c3b-2d55-4879-b5eb-303bc8266ea2',
  stage_id = '6d6b6eb3-5679-43d5-93b1-d22376232c41',
  updated_at = now()
WHERE pipeline_id = 'a272c23a-bcd8-411c-bbc1-706c2aa95055'
  AND assigned_to IS NULL
  -- NAO e recuperacao/winback/carrinho
  AND NOT (
    lower(coalesce(title,'')) LIKE '%recupera%' 
    OR lower(coalesce(title,'')) LIKE '%winback%' 
    OR lower(coalesce(title,'')) LIKE '%carrinho%'
    OR lower(coalesce(title,'')) LIKE '%cartao%'
    OR lower(coalesce(title,'')) LIKE '%recusado%'
  )
  -- NAO e formulario/webchat
  AND lower(coalesce(lead_source,'')) NOT IN (
    'formulario', 'form', 'chat_widget', 'webchat'
  )
  -- NAO e recorrencia (ja migrado na etapa 2)
  AND lower(coalesce(lead_source,'')) NOT IN (
    'kiwify_recorrencia', 'kiwify_renovacao'
  );
```

---

## Resultado Final Esperado

### Vendas - Nacional (apos limpeza)

| Tipo de Deal | Descricao |
|--------------|-----------|
| Recuperacoes | Titulo com "recupera", "winback" |
| Carrinhos | Titulo com "carrinho", "cartao", "recusado" |
| Formularios | lead_source = formulario, form, chat_widget, webchat |
| Com vendedor | assigned_to preenchido |

### CS - Novos Clientes

| Conteudo |
|----------|
| Vendas organicas (checkout direto sem vendedor) |
| Vendas de afiliados (automaticas) |
| Stage: Onboarding |

### CS - Recorrencia

| Conteudo |
|----------|
| Renovacoes automaticas |
| Recorrencias Kiwify |

---

## Validacao Pos-Migracao

```sql
SELECT 
  p.name as pipeline,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE d.status = 'open') as abertos,
  COUNT(*) FILTER (WHERE d.status = 'won') as ganhos
FROM deals d
JOIN pipelines p ON p.id = d.pipeline_id
WHERE p.name IN ('Vendas - Nacional', 'CS - Novos Clientes', 'CS - Recorrencia')
GROUP BY p.name
ORDER BY p.name;
```

---

## Ordem de Execucao

```text
1. Criar stage "Entrada" no CS - Recorrencia
2. Migrar recorrencias (~1.647 deals)
3. Migrar organicos/afiliados (~5.000 deals)
4. Validar contagens
5. Confirmar resultado
```


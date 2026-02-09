

# Trava de Protecao v1.0 — Routing de Cliente Retornante + Persistencia de Consultor

## Objetivo

Criar marcadores de protecao ("travas") nos dois blocos criticos do webhook para que qualquer desenvolvedor (humano ou IA) saiba que essas secoes **nao podem ser alteradas** sem aprovacao explicita.

## O que sera feito

### 1. Bloco de comentario de protecao nos 2 trechos criticos

Adicionar um header de protecao padronizado antes de cada bloco, com:
- Identificador da trava e versao
- Descricao do comportamento protegido
- Regra de que alteracoes precisam de aprovacao
- Data de criacao

### 2. Trechos protegidos

**Trava ROUTING-LOCK v1.0** (linhas ~471-498)
- Busca `consultant_id` no contato
- Se existe, cria conversa em `copilot` com `assigned_to` = consultor
- Se nao existe, cria em `autopilot` (fluxo normal)

**Trava TRANSFER-PERSIST-LOCK v1.0** (linhas ~765-853)
- Busca consultor por contato, email coletado, ou regex nas mensagens
- Atribui `assigned_to` e `ai_mode = copilot`
- Persiste `consultant_id` no contato para routing futuro
- Executa transferencia de departamento

### 3. Formato do comentario de trava

```text
// ═══════════════════════════════════════════════════════════════
// 🔒 TRAVA [NOME] v1.0 — [DATA]
// PROTEGIDO: [descricao do comportamento]
// ⚠️  NAO ALTERAR sem aprovacao explicita do responsavel.
// Qualquer mudanca deve: (1) ser justificada, (2) testada, (3) versionada.
// ═══════════════════════════════════════════════════════════════
```

## Secao Tecnica

### Arquivo modificado
- `supabase/functions/meta-whatsapp-webhook/index.ts`

### Mudancas
- Adicionar bloco de comentario antes da linha ~471 (routing de cliente retornante)
- Adicionar bloco de comentario antes da linha ~765 (transferencia com persistencia)
- Zero mudanca de logica — apenas comentarios de protecao

### Impacto
- Nenhum impacto funcional (somente comentarios)
- Nenhuma regressao possivel
- Serve como documentacao viva e alerta para futuras edicoes

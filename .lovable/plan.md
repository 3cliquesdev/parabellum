

# Corrigir: validar role ao atribuir consultant_id e limpar dados incorretos

## Problema identificado

- **Camila de Farias** (`de03d434...`) tem role `sales_rep`, mas possui clientes com `consultant_id` apontando para ela
- O sistema de roteamento trata qualquer `consultant_id` preenchido como roteamento direto, sem validar o role
- Resultado: conversas sendo roteadas para quem não é consultor

## Correção em 3 partes

### 1. Limpar dados — migração SQL
- Atualizar `contacts` onde `consultant_id` aponta para usuários que **não** possuem role `consultant` em `user_roles`
- Setar `consultant_id = NULL` nesses registros para que o fluxo de IA reassuma o controle
- Registrar quantos contatos foram afetados via log

### 2. Validação no backend — Edge Functions
**`bulk-import-contacts`**: já resolve nome → consultant_id, mas não valida se o usuário tem role `consultant`. Adicionar checagem: só aceitar IDs de usuários com role `consultant`.

**`update-user`**: quando o role de um usuário muda **de** `consultant` para outro role, limpar automaticamente o `consultant_id` dos contatos vinculados a ele (evita dados órfãos).

### 3. Validação no frontend — atribuição manual
Nos componentes que permitem selecionar consultor para um contato (dropdowns de atribuição), garantir que apenas usuários com role `consultant` apareçam — o hook `useConsultants` já faz isso corretamente, mas verificar se todos os pontos de atribuição usam esse hook.

## Sem risco de regressão
- Contatos com consultores válidos não são afetados
- Apenas contatos com `consultant_id` inválido (role ≠ consultant) são limpos
- Roteamento continua funcionando normalmente para consultores reais


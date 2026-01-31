
# Correção: Página /users Não Carrega no Publicado

## Problema Identificado

A versão publicada está rodando com **cache de código antigo** porque a `APP_SCHEMA_VERSION` não foi atualizada após as mudanças no sistema de permissões.

**Situação atual:**
- Schema version: `2026.01.30-v1` (desatualizado)
- Código correto: `hasFullAccess("admin")` retorna `true`
- Mas navegador usa versão antiga cacheada

## Solução (3 Ajustes Simples)

### 1. Atualizar Schema Version
**Arquivo:** `src/lib/build/schemaVersion.ts`

```typescript
export const APP_SCHEMA_VERSION = "2026.01.31-v1";
```

**Efeito:** Força todos os navegadores a limparem cache automaticamente.

---

### 2. Verificação Redundante no ProtectedRoute
**Arquivo:** `src/components/ProtectedRoute.tsx`

Adicionar checagem `hasFullAccess` ANTES de verificar permissões específicas:

```typescript
// Permission-based access control (new unified system)
if (requiredPermission) {
  // ✅ SEGURANÇA: Roles com acesso total NUNCA devem ser bloqueados
  if (hasFullAccess(role)) {
    return <>{children}</>;
  }
  
  // ... resto do código de permissões
}
```

**Efeito:** Admin/manager/general_manager sempre passam, mesmo se permissões ainda estão carregando.

---

### 3. Log de Diagnóstico em Produção (Temporário)
**Arquivo:** `src/hooks/useRolePermissions.tsx`

Adicionar log para rastrear problema:

```typescript
const hasPermission = (key: string): boolean | undefined => {
  // 🆕 Log de diagnóstico (remover após validação)
  console.log(`[hasPermission] key="${key}" role="${role}" fullAccess=${hasFullAccess(role)}`);
  
  // Roles com acesso total sempre true
  if (hasFullAccess(role)) return true;
  // ...
};
```

---

## Resumo das Mudanças

| Arquivo | Mudança | Risco |
|---------|---------|-------|
| `src/lib/build/schemaVersion.ts` | Atualizar para `2026.01.31-v1` | Nenhum |
| `src/components/ProtectedRoute.tsx` | Adicionar verificação hasFullAccess antes de permissões | Nenhum |
| `src/hooks/useRolePermissions.tsx` | Adicionar log temporário | Nenhum |

## Validação Pós-Deploy

1. Acessar versão publicada em **janela anônima**
2. Login com admin ou manager
3. Navegar para `/users`
4. Verificar console para logs de diagnóstico
5. Confirmar que página carrega corretamente

## Conformidade com Base de Conhecimento

| Regra | Status |
|-------|--------|
| Preservação do existente | ✅ Não remove nenhuma feature |
| Zero regressão | ✅ Apenas adiciona segurança extra |
| Cache/Versões | ✅ Força atualização conforme documentado |

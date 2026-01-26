
## Plano: Resolver Problema de Acesso dos Atendentes

### Diagnóstico Completo

Após análise detalhada do código e banco de dados, identifiquei a **situação real**:

---

### O Que Está Acontecendo

1. **O erro de "Acesso Negado" em `/settings` é CORRETO**
   - Atendentes (`support_agent`) não devem ter acesso às configurações
   - A permissão `settings.view` está desabilitada para esse role por design

2. **Miguel Fedes está configurado corretamente**
   - Role: `support_agent`
   - Department: `Suporte`
   - Não está bloqueado nem arquivado
   - Tem todas as permissões de inbox/tickets habilitadas

3. **Existe um problema estrutural com o role `user`**
   - 4.370 usuários têm role `user` (clientes/leads)
   - Esses usuários entram pelo signup público e recebem `user` automaticamente
   - O role `user` não tem home page definida, causando loop de redirect

---

### Problemas Identificados

| Problema | Impacto | Solução |
|----------|---------|---------|
| Atendentes acessando `/settings` | "Acesso Negado" (esperado) | Nenhuma - comportamento correto |
| Role `user` sem home page | Loop de redirect | Adicionar home page para `user` |
| Atendentes não sabem onde ir | Confusão de navegação | Melhorar UX de onboarding |

---

### Solução Proposta

#### 1. Adicionar Página de Cliente para Role `user`

Criar uma página simples para clientes que fizeram signup mostrando:
- "Sua conta está ativa"
- Link para suporte via WhatsApp/Widget
- Informações de contato

#### 2. Atualizar ProtectedRoute com Home Page para `user`

Adicionar `user: "/client-portal"` no mapeamento de páginas por role:

```typescript
const roleHomePage: Record<string, string> = {
  support_manager: "/support",
  support_agent: "/support",
  financial_manager: "/support",
  financial_agent: "/support",
  cs_manager: "/cs-management",
  consultant: "/my-portfolio",
  sales_rep: "/",
  general_manager: "/analytics",
  admin: "/",
  manager: "/",
  user: "/client-portal", // NOVO
};
```

#### 3. Atualizar Auth.tsx para Redirecionar Clientes

No switch de roles após login, adicionar:

```typescript
case "user":
  navigate("/client-portal");
  break;
```

#### 4. Criar Rota Pública para Client Portal

No App.tsx, adicionar rota sem permissão específica:

```typescript
<Route path="/client-portal" element={
  <ProtectedRoute>
    <ClientPortal />
  </ProtectedRoute>
} />
```

---

### Arquivos a Criar/Modificar

| Arquivo | Ação | Descrição |
|---------|------|-----------|
| `src/pages/ClientPortal.tsx` | Criar | Página simples para clientes |
| `src/components/ProtectedRoute.tsx` | Modificar | Adicionar home page para role `user` |
| `src/pages/Auth.tsx` | Modificar | Adicionar redirect para `user` |
| `src/App.tsx` | Modificar | Adicionar rota `/client-portal` |

---

### Componente ClientPortal.tsx

```typescript
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function ClientPortal() {
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Bem-vindo(a)!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Sua conta está ativa. Para atendimento, entre em contato 
            conosco pelos canais abaixo.
          </p>
          
          <div className="flex flex-col gap-2">
            <Button variant="outline" className="w-full">
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com Suporte
            </Button>
            
            <Button variant="ghost" onClick={handleLogout} className="w-full">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

---

### Esclarecimento Importante

O erro "Acesso Negado" em `/settings` que você viu na sessão **é comportamento correto**. Atendentes não devem ter acesso às configurações do sistema.

Se um atendente específico precisa acessar configurações:
1. Promova para `support_manager` (gerente de suporte)
2. Ou habilite `settings.view` manualmente para o role `support_agent`

---

### Secao Tecnica: Mudancas no Codigo

**ProtectedRoute.tsx - Linha 47-58:**

```typescript
const roleHomePage: Record<string, string> = {
  support_manager: "/support",
  support_agent: "/support",
  financial_manager: "/support",
  financial_agent: "/support",
  cs_manager: "/cs-management",
  consultant: "/my-portfolio",
  sales_rep: "/",
  general_manager: "/analytics",
  admin: "/",
  manager: "/",
  user: "/client-portal", // ADICIONAR
  ecommerce_analyst: "/analytics", // ADICIONAR
};
```

**Auth.tsx - Linha 80-82:**

```typescript
case "user":
  navigate("/client-portal");
  break;
case "ecommerce_analyst":
  navigate("/analytics");
  break;
default:
  navigate("/client-portal"); // Fallback seguro
```

**App.tsx - Nova rota:**

```typescript
<Route path="/client-portal" element={
  <ProtectedRoute>
    <ClientPortal />
  </ProtectedRoute>
} />
```

---

### Resultado Esperado

- Atendentes acessam `/support` normalmente
- Atendentes veem "Acesso Negado" em `/settings` (correto)
- Clientes (`user`) são redirecionados para portal simples
- Sem mais loops de redirect
- Cada role tem uma home page definida


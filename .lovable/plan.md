

## Plano: Proteção Anti-Clique para Status Ocupado

### Problema Identificado

O status muda de "Busy" para "Online" porque:
1. O atendente (ou o próprio sistema) está chamando `updateStatus("online")` sem restrições
2. As mudanças feitas pelo atendente via `AvailabilityToggle` nao estao sendo auditadas
3. Nao ha confirmacao extra para voltar de "Busy" para "Online"

### Solucao

Implementar confirmacao extra (dialog) quando o atendente tentar mudar de "Busy" para "Online", similar ao que ja existe para ir para "Offline".

---

### Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `src/components/AvailabilityToggle.tsx` | Adicionar dialog de confirmacao para Busy → Online |
| `src/hooks/useAvailabilityStatus.tsx` | Adicionar auditoria para TODAS as mudancas de status |

---

### Implementacao Detalhada

#### 1. Adicionar Dialog de Confirmacao (AvailabilityToggle.tsx)

Criar um novo estado e dialog para confirmar a mudanca de Busy para Online:

```typescript
// Novos estados
const [showBusyToOnlineDialog, setShowBusyToOnlineDialog] = useState(false);

// Modificar handleStatusChange
const handleStatusChange = (newStatus: "online" | "busy" | "offline") => {
  if (newStatus === "offline") {
    setShowOfflineDialog(true);
  } else if (newStatus === "online" && status === "busy") {
    // Nova proteção: confirmar antes de sair de Busy
    setShowBusyToOnlineDialog(true);
  } else {
    updateStatus(newStatus);
  }
};

// Novo handler para confirmacao
const handleConfirmBusyToOnline = () => {
  updateStatus("online");
  setShowBusyToOnlineDialog(false);
  toast({
    title: "Status alterado",
    description: "Você voltou para Online e receberá novas conversas.",
  });
};
```

#### 2. Criar Componente BusyToOnlineDialog

Criar dialog similar ao `OfflineConfirmationDialog`:

```typescript
// Novo componente ou inline no AvailabilityToggle
<AlertDialog open={showBusyToOnlineDialog} onOpenChange={setShowBusyToOnlineDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Voltar para Online?</AlertDialogTitle>
      <AlertDialogDescription>
        Voce esta no status "Ocupado". Ao voltar para Online, 
        voce passara a receber novas conversas automaticamente.
        
        Tem certeza que deseja continuar?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction onClick={handleConfirmBusyToOnline}>
        Confirmar - Ficar Online
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

#### 3. Adicionar Auditoria para TODAS as Mudancas (useAvailabilityStatus.tsx)

Modificar `updateStatusMutation` para registrar auditoria:

```typescript
const updateStatusMutation = useMutation({
  mutationFn: async (newStatus: AvailabilityStatus) => {
    if (!user) throw new Error("Usuário não autenticado");

    console.log(`[useAvailabilityStatus] Updating status to: ${newStatus}`);

    // 1. Buscar status anterior para auditoria
    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("availability_status")
      .eq("id", user.id)
      .single();

    // 2. Atualizar status
    const { error } = await supabase
      .from("profiles")
      .update({ 
        availability_status: newStatus,
        last_status_change: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) throw error;

    // 3. Registrar na auditoria (mudanca feita pelo proprio atendente)
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: 'UPDATE',
      table_name: 'profiles',
      record_id: user.id,
      old_data: { availability_status: oldProfile?.availability_status },
      new_data: { 
        availability_status: newStatus,
        changed_by_self: true,  // Indica que foi o proprio atendente
        source: 'availability_toggle'
      }
    });

    return newStatus;
  },
  // ... resto do codigo
});
```

---

### Fluxo Apos Implementacao

```text
[Atendente esta Busy]
        |
        v
  Clica em "Online"
        |
        v
  🆕 Dialog aparece:
  "Voce esta Ocupado. Voltar para Online?"
  [Cancelar] [Confirmar]
        |
        v
  Se confirmar → updateStatus("online")
        |
        v
  Mudanca registrada na auditoria
```

---

### Beneficios

- Evita cliques acidentais que mudam de Busy para Online
- Registra TODAS as mudancas de status (admin e atendente)
- Permite rastrear quem mudou o status e quando
- Atendente precisa confirmar explicitamente a volta para Online

---

### Secao Tecnica

**Componentes envolvidos:**
- `src/components/AvailabilityToggle.tsx` - UI do toggle
- `src/hooks/useAvailabilityStatus.tsx` - Logica de mudanca

**Dialog a usar:**
- `AlertDialog` do Radix UI (ja importado no projeto)

**Campos de auditoria:**
- `changed_by_self: true` - Mudanca feita pelo proprio atendente
- `source: 'availability_toggle'` - Origem da mudanca

**Linhas a modificar:**
- `AvailabilityToggle.tsx` linhas 42-74 (handleStatusChange)
- `useAvailabilityStatus.tsx` linhas 63-104 (updateStatusMutation)


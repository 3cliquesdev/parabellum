
# Melhoria: Aviso Obrigatório de Tags ao Encerrar Ticket

## Situação Atual

Quando um usuário tenta encerrar um ticket (status `resolved` ou `closed`) sem tags obrigatórias, o sistema exibe um toast padrão:
- Tipo: toast simples (canto da tela)
- Mensagem: "Tags obrigatórias" + "Adicione pelo menos uma tag antes de encerrar o ticket."
- Impacto: Fácil de perder/ignorar, pouco visual

**Problema**: Toast é discreto demais. Admin/agente pode não notar e achar que a ação foi bloqueada por erro, não por falta de dados.

## Solução: AlertDialog Modal Bloqueador

Substituir o toast por um `AlertDialog` (modal) que:

1. **Bloqueia a ação** - Modal força o usuário a reconhecer
2. **Mensagem clara em 2 níveis**:
   - Título destacado: "⚠️ Tags Obrigatórias"
   - Descrição: Explicar que a configuração requer tags antes de encerrar
   - Botão auxiliar: "Adicionar Tags" leva direto ao card de tags
3. **Fluxo**:
   - Usuário clica em "Resolvido" ou "Fechado"
   - Dialog abre bloqueando a ação
   - Usuário tem opções:
     - "Cancelar" - volta sem fazer nada
     - "Adicionar Tags" - fecha dialog e scroll até TicketTagsCard (novo)
     - Ou sair e voltar depois

## Mudanças Técnicas

### 1. `src/components/TicketDetails.tsx`

**Adicionar estado para controlar o dialog:**
```typescript
const [showMissingTagsDialog, setShowMissingTagsDialog] = useState(false);
const [pendingStatus, setPendingStatus] = useState<string | null>(null);
```

**Modificar `handleStatusChange`:**
- Se status é `resolved`/`closed` e tags obrigatórias com zero tags → abrir dialog (não fazer toast)
- Armazenar o status pendente em `pendingStatus`
- Não chamar `updateTicket.mutate` ainda

**Adicionar novo handler `handleConfirmStatusChange`:**
- Chamado quando usuário clica "Confirmar" no dialog
- Executa o `updateTicket.mutate` com o status armazenado

**Renderizar `AlertDialog` no final do JSX:**
```typescript
<AlertDialog open={showMissingTagsDialog} onOpenChange={setShowMissingTagsDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle className="flex items-center gap-2 text-destructive">
        <AlertTriangle className="h-5 w-5" />
        Tags Obrigatórias Não Adicionadas
      </AlertDialogTitle>
      <AlertDialogDescription className="space-y-3">
        <p>
          A configuração do seu departamento exige que <strong>pelo menos uma tag</strong> seja adicionada 
          antes de encerrar um ticket.
        </p>
        <p className="text-sm text-muted-foreground">
          Tags ajudam a classificar e organizar tickets para análise futura.
        </p>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancelar</AlertDialogCancel>
      <AlertDialogAction 
        onClick={() => {
          setShowMissingTagsDialog(false);
          // Scroll até TicketTagsCard
          document.getElementById('ticket-tags-card')?.scrollIntoView({ behavior: 'smooth' });
        }}
        className="bg-blue-600 hover:bg-blue-700"
      >
        <Tag className="h-4 w-4 mr-2" />
        Adicionar Tags Agora
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 2. `src/components/TicketTagsCard.tsx`

**Adicionar ID ao container:**
```typescript
<Card id="ticket-tags-card" className="...">
```

Isso permite scroll automático quando usuário clica "Adicionar Tags Agora".

## Fluxo Resultante

```
Usuário clica status "Resolvido/Fechado"
    ↓
handleStatusChange verifica tags obrigatórias
    ↓
Não tem tags? → Abre AlertDialog (modal)
    ↓ (usuário vê: "⚠️ Tags Obrigatórias - Adicione uma tag!")
    ├─ Clica "Cancelar" → Dialog fecha, ticket continua aberto
    │
    └─ Clica "Adicionar Tags Agora" → Scroll até card de tags + fecha dialog
         (usuário adiciona tag manualmente e tenta novamente)
```

## Benefícios

- ✅ **Visibilidade**: Modal grande e clara, impossível ignorar
- ✅ **Guidância**: Botão "Adicionar Tags Agora" leva direto para o card
- ✅ **UX clara**: Mensagem em português explicando a política
- ✅ **Regressão zero**: Apenas muda apresentação do bloqueio (lógica de validação continua igual)
- ✅ **Consistência**: Usa o mesmo padrão de `AlertDialog` que CloseConversationDialog, OfflineConfirmationDialog, etc.

## Arquivos Modificados

1. **`src/components/TicketDetails.tsx`**
   - Adicionar estado `showMissingTagsDialog` e `pendingStatus`
   - Refatorar `handleStatusChange` para abrir dialog ao invés de fazer toast
   - Adicionar `handleConfirmStatusChange` para execução adiada
   - Renderizar `<AlertDialog>` no final
   - Importar `AlertDialog*` e `AlertTriangle` (já tem)

2. **`src/components/TicketTagsCard.tsx`**
   - Adicionar `id="ticket-tags-card"` ao Card raiz (1 linha)

## Testes Obrigatórios

Após implementação:
1. Ativar obrigatoriedade de tags em Departamentos > Campos > Tags
2. Tentar encerrar ticket sem tags → Deve exibir AlertDialog
3. Clicar "Adicionar Tags Agora" → Deve fazer scroll até card de tags
4. Adicionar tag e tentar encerrar novamente → Deve funcionar normalmente
5. Clicar "Cancelar" no dialog → Deve fechar sem fazer nada
6. Verificar que tickets sem obrigatoriedade de tags continuam encerrando normalmente (sem dialog)

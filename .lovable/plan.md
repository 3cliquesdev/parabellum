
# Fix: Mostrar Todos os Agentes com Indicador de Status Online

## Problema

O dialog `TransferConversationDialog` está configurado com `onlineOnly: true` na linha 56, mostrando **APENAS agentes online**. Quando não há agentes online em um departamento (todos estão `busy`, `away`, ou `offline`), a lista fica vazia e o usuário não consegue visualizar os agentes disponíveis.

Além disso, há uma restrição RLS na tabela `agent_departments` que impede usuários não-gerenciais de visualizar a lista completa de agentes do departamento.

## Solução em Duas Partes

### **Parte 1: Liberar acesso de leitura à tabela `agent_departments` (RLS)**

**Por que**: O hook `useUsersByDepartment` usa `agent_departments!inner(department_id)` e a RLS atual só permite que cada agente veja seus próprios registros. Usuários normais (sales_rep, support_agent, etc.) precisam ver quem pertence ao departamento para transferir conversas.

**Mudança SQL**: Criar uma nova política RLS que permite leitura para usuários autenticados.

```sql
CREATE POLICY "Authenticated users can read agent_departments"
ON public.agent_departments
FOR SELECT
USING (auth.uid() IS NOT NULL);
```

### **Parte 2: Mostrar todos os agentes com indicador visual de status (Frontend)**

**Mudança no componente**: `src/components/TransferConversationDialog.tsx`

1. **Linha 56**: Mudar de `onlineOnly: true` para `onlineOnly: false`
   - Isso permite que o hook retorne TODOS os agentes do departamento

2. **Linha 158**: Atualizar label de "(apenas online)" para "(todos)"
   - Deixar claro que estamos mostrando todos

3. **Adicionar lógica de separação**: Dividir agentes em dois grupos:
   - **Agentes Online** (availability_status === 'online')
   - **Agentes Indisponíveis** (busy, away, offline)

4. **Adicionar badges de status**:
   - Online: Verde, com badge "Online"
   - Busy: Amarelo, com badge "Ocupado"
   - Away: Cinza, com badge "Ausente"
   - Offline: Vermelho escuro, com badge "Offline"

5. **Melhorar visual**:
   - Mostrar agentes online PRIMEIRO (listagem prioritária)
   - Mostrar agentes indisponíveis DEPOIS (colapsáveis ou com separador)
   - Cada um com cor de avatar diferente de acordo com status

## Fluxo de Uso

1. Usuário abre dialog de transferência
2. Seleciona departamento
3. Vê:
   - "Distribuir Automaticamente" (opção padrão)
   - **Agentes Online** (com badge verde)
   - **Separador/Seção**
   - **Agentes Indisponíveis** (com badge amarelo/cinza/vermelho)
4. Pode escolher:
   - Distribuição automática (recomendado)
   - Um agente online específico
   - Um agente indisponível (por força, se necessário)

## Impacto

- ✅ **Resolve o problema RLS**: Usuários não-gerenciais conseguem ver a lista de agentes
- ✅ **Mostra status visual**: Deixa claro quem está online e quem não está
- ✅ **Mantém distribuição automática**: Opção padrão continua funcionando
- ✅ **Zero regressão**: Apenas muda a visibilidade e visual, não a lógica de transferência
- ✅ **Segurança**: Apenas leitura de `agent_departments`, nenhuma mudança em permissões de escrita

## Testes Obrigatórios

- [ ] Testar com usuário `sales_rep` (Thaynara) - deve ver agentes online
- [ ] Testar com usuário `admin` - deve continuar funcionando normalmente
- [ ] Verificar que a lista mostra status correto (online/busy/away/offline)
- [ ] Testar distribuição automática
- [ ] Testar seleção manual de agente indisponível
- [ ] Console sem erros
- [ ] RLS não quebra para escrita (managers continuam gerenciando)

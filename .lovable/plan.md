

## Cancelar Execucoes Duplicadas - edevaldo.horizonn@gmail.com

### Situacao Atual

3 execucoes ativas do playbook "Onboarding - Assinaturas":

| Execucao | Criada em | Status | Acao |
|---|---|---|---|
| `92d6e241` | 10/02 15:47 | running | **Manter** (mais recente) |
| `156d352b` | 10/02 06:25 | running | Cancelar |
| `2575c2e9` | 10/02 06:25 | running | Cancelar |

### O que sera feito

1. Atualizar o status das 2 execucoes mais antigas para `cancelled`
2. Remover itens pendentes na fila (`playbook_execution_queue`) dessas execucoes
3. Manter apenas a execucao mais recente (`92d6e241`) ativa

### Detalhes tecnicos

Sera executada uma migration SQL para:
- `UPDATE playbook_executions SET status = 'cancelled' WHERE id IN ('156d352b-...', '2575c2e9-...')`
- `UPDATE playbook_execution_queue SET status = 'cancelled' WHERE execution_id IN ('156d352b-...', '2575c2e9-...) AND status = 'pending'`

### Impacto
- Zero regressao: apenas cancela execucoes duplicadas
- A execucao principal (92d6e241) continua normalmente
- A trava anti-duplicacao ja deployada impede que isso aconteca novamente


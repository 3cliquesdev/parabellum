

# Atualizar 30 contatos de hoje como clientes Kiwify

## Situação
Identifiquei **30 contatos** que conversaram hoje e TÊM compras na `kiwify_events`, mas estão com `kiwify_validated=false`. O `read_query` é read-only, então preciso usar outro método para o UPDATE.

## Contatos identificados (todos com compras Kiwify confirmadas)
Alex Chiarelo, Michel, Arkyn, Carlos, Diego Teixeira, Distribuimax, Dr Henrique Monteiro, Felipe, Leonardo, Marcello Cunha, Monica, Paulo Silva, Priscila, Renata, rgm Lembrancas, ROBERTO, Rodrigo Lanzoni, Sérgio, Sy, Thais Mendes, Tiago Camatta, Vanessa Almeida, Vinicius Moncaio, Alice, Cesar, Gustavo, Isabella, LAERCIO, e mais 2.

## Plano de execução

1. **Criar edge function temporária `bulk-update-kiwify-status`** que:
   - Recebe lista de contact IDs
   - Atualiza `status='customer'`, `kiwify_validated=true`, `kiwify_validated_at=now()`
   - Registra nota interna em cada contato via tabela `interactions`

2. **Executar a função** passando os 30 IDs identificados

3. **Deletar a edge function** após uso (é one-off)

**Alternativa mais simples:** Usar a edge function existente `batch-validate-kiwify-contacts` mas corrigir o filtro para ignorar contatos com telefones LID (que não são WhatsApp real), para que os contatos válidos sejam processados.

## Correção permanente no batch-validate
Adicionar filtro `AND phone ~ '^\d{10,13}$'` para pular contatos com telefones LID/inválidos, garantindo que futuros batch runs processem contatos reais primeiro.


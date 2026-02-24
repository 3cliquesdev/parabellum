
# Simplificar Labels do Painel "Resposta IA" (sem Kiwify)

## Resumo
Renomear todos os labels tecnicos do painel de propriedades do no "Resposta IA" para nomes simples e diretos. Remover a secao "Dados do Cliente (CRM)" que e interna (Kiwify) e nao faz sentido para o cliente final.

## Arquivos alterados

### 1. `src/components/chat-flows/panels/BehaviorControlsSection.tsx`

| Atual | Novo |
|-------|------|
| CONTROLES DE COMPORTAMENTO | COMO A IA DEVE RESPONDER |
| Tooltip: "...respostas deterministicas" | "Configure como a IA vai se comportar neste ponto do fluxo" |
| Objetivo da IA | O que a IA deve fazer aqui |
| Placeholder: "Ex: Responder duvidas sobre rastreio de pedidos" | "Ex: Tirar duvidas sobre entrega do pedido" |
| "A IA respondera SOMENTE sobre este objetivo especifico" | "A IA so vai falar sobre esse assunto" |
| Maximo de Frases | Tamanho da resposta |
| Restricoes Anti-Alucinacao | O que a IA NAO pode fazer |
| Proibir Perguntas | Nao fazer perguntas |
| "IA nao pode fazer perguntas ao cliente" | "A IA so responde, nao pergunta nada" |
| Proibir Opcoes | Nao dar opcoes numeradas |
| "IA nao pode oferecer multipla escolha" | "A IA nao oferece lista de opcoes (1, 2, 3...)" |

### 2. `src/components/chat-flows/panels/RAGSourcesSection.tsx`

| Atual | Novo |
|-------|------|
| FONTES DE DADOS (RAG) | DE ONDE A IA BUSCA INFORMACAO |
| Tooltip tecnico sobre RAG | "Escolha de onde a IA vai puxar as informacoes para responder o cliente" |
| Base de Conhecimento | Artigos e FAQ |
| "Filtrar por categorias (vazio = todas)" | "Buscar apenas nestas categorias:" |
| **REMOVER bloco inteiro "Dados do Cliente (CRM)"** | -- |
| Rastreio de Pedidos | Rastreio de Envio |
| "A IA consultara status de envio e codigo de rastreio automaticamente" | "A IA consulta onde esta o pacote do cliente" |

A secao "Dados do Cliente (CRM)" com o switch `use_customer_data` e checkbox `use_order_history` sera completamente removida do componente, pois sao dados internos do Kiwify que clientes nao perguntam.

### 3. `src/components/chat-flows/panels/SmartCollectionSection.tsx`

| Atual | Novo |
|-------|------|
| COLETA INTELIGENTE | PEDIR DADOS DO CLIENTE |
| Tooltip: "A IA solicitara dados faltantes..." | "A IA pede os dados que faltam do cliente durante a conversa, de forma natural" |
| "Dados que a IA pode solicitar quando necessario" | "A IA pode pedir esses dados se nao tiver:" |
| Dica final longa | "A IA pede um dado por vez, so se ainda nao tiver no cadastro" |

### 4. `src/components/chat-flows/AIResponsePropertiesPanel.tsx`

| Atual | Novo |
|-------|------|
| CONTEXTO ADICIONAL | INSTRUCOES EXTRAS |
| Placeholder: "Instrucoes adicionais para a IA..." | "Diga algo a mais para a IA seguir aqui..." |
| MENSAGEM DE FALLBACK | RESPOSTA QUANDO NAO SOUBER |
| "Exibida quando a IA nao encontra resposta ou viola restricoes" | "O que a IA diz quando nao tem a informacao" |

## O que NAO muda
- Nenhuma key de dados (objective, max_sentences, use_tracking, etc.)
- Nenhuma logica de negocio ou persistencia
- Nenhuma funcionalidade removida que afete o fluxo (o bloco Kiwify/CRM era visual, os dados continuam disponiveis via tools internas)

## Impacto
- Apenas mudanca visual de textos
- Remocao de uma secao (CRM/Kiwify) que nao e util para quem monta fluxos
- Zero regressao



# Exibir ID dos consultores na página de Consultores

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Situação atual

A página `/consultants` (Consultores) lista os consultores com nome, cargo, clientes e valor da carteira — mas **não mostra o UUID (ID)** deles. Para preencher a planilha de importação com `id_consultor`, você precisa ver esses IDs.

## Alteração

### `src/pages/Consultants.tsx`
Adicionar o ID do consultor no card, logo abaixo do cargo, com um botão de copiar para facilitar:

```
Consultor: João Silva
Consultor de CS
ID: 3f8a1b2c-... [📋 copiar]
```

- Exibir UUID truncado (primeiros 8 caracteres + `...`) para não poluir o card
- Botão de copiar que copia o UUID completo para a área de transferência
- Toast de confirmação ao copiar

Upgrade puro — sem impacto em funcionalidades existentes.


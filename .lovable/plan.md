

# Mostrar Nome do Template no Cabecalho das Colunas do Relatorio

## Problema
Atualmente os cabecalhos das colunas de email no Excel e no preview mostram nomes genericos como "Email 1 - Template", "Email 2 - Template". O usuario quer que o cabecalho mostre o nome real do template (ex: "Onboarding (Simples)", "Acesso ao ArmazemDrop").

## Solucao

Detectar o nome do template mais frequente em cada posicao (email 1, email 2, etc.) a partir dos dados ja carregados e usar esse nome como cabecalho da coluna.

### 1. `src/hooks/useExportPlaybookEmailSequence.tsx`

Alterar a geracao dos headers do Excel:
- Em vez de `Email ${n} - Template`, usar o nome real do template daquela posicao
- Formato: `{nome_template} - Data`, `{nome_template} - Hora`, `{nome_template} - Status`
- Ex: "Onboarding (Simples) - Data", "Onboarding (Simples) - Status"
- A coluna "Template" em si sera removida pois o nome ja esta no cabecalho

Logica:
- Percorrer todos os grupos e para cada posicao (0, 1, 2...) coletar o `email_template_name` mais comum
- Usar esse nome no cabecalho

### 2. `src/pages/PlaybookEmailSequenceReport.tsx`

Alterar o preview da tabela:
- Calcular os nomes dos templates por posicao a partir dos dados agrupados
- Substituir o cabecalho generico "Email 1", "Email 2", "Email 3" pelo nome real do template
- Manter as informacoes dentro de cada celula (data, hora, status) sem o nome do template (pois ja esta no cabecalho)

### Detalhes tecnicos

```text
Cabecalho atual (Excel):
| Email 1 - Template | Email 1 - Data | Email 1 - Hora | Email 1 - Status |

Cabecalho novo (Excel):
| Onboarding (Simples) - Data | Onboarding (Simples) - Hora | Onboarding (Simples) - Status |

Preview atual:
| Email 1 | Email 2 | Email 3 |

Preview novo:
| Onboarding (Simples) | Acesso ao ArmazemDrop | Email 3 |
```

Para determinar o nome de cada posicao, sera usada a moda (valor mais frequente) dos `email_template_name` naquela posicao. Se nao houver nome, cai no fallback "Email N".

## Impacto
- Apenas mudanca visual nos cabecalhos
- Dados exportados continuam os mesmos
- Zero impacto em logica de negocio




# Permitir que clientes enviem evidências/anexos nos comentários de tickets

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Diagnóstico

O problema é claro: **o portal do cliente não tem funcionalidade de upload de arquivos**. Atualmente:

| Componente | Suporta anexos? |
|---|---|
| `MyTicketDetail.tsx` (UI do cliente) | **NÃO** — só tem `Textarea` para texto |
| `add-customer-comment` (Edge Function) | **NÃO** — só aceita `{ ticket_id, contact_id, content }`, sem campo `attachments` |
| `get-customer-tickets` (Edge Function) | **SIM** — já retorna `attachments` dos comentários e a UI já renderiza imagens/links |

Ou seja, a **leitura** de anexos já funciona (se o time interno anexar algo, o cliente vê). Mas o **envio** pelo cliente está completamente ausente.

## Solução — 3 mudanças

### 1. Criar bucket de storage para anexos de clientes

O bucket `ticket-attachments` pode já existir (usado pelo time interno). Precisamos garantir que exista e que tenha uma policy de INSERT pública (ou via edge function com service role). Como o cliente não é um usuário autenticado no Supabase Auth, o upload será feito **via edge function** usando service role key.

**Nova Edge Function**: `upload-ticket-attachment`
- Recebe o arquivo via FormData
- Valida tipo (imagens, PDF, vídeos) e tamanho (max 10MB)
- Faz upload ao bucket `ticket-attachments` com service role
- Retorna `{ url, name, type, size }`

### 2. Atualizar Edge Function `add-customer-comment`

Adicionar campo opcional `attachments` ao body:
```
{ ticket_id, contact_id, content, attachments?: Array<{url, name, type, size}> }
```
O insert na tabela `ticket_comments` já tem coluna `attachments` (tipo JSON) — basta passar os dados.

### 3. Atualizar UI `MyTicketDetail.tsx`

Adicionar ao formulário de resposta do cliente:
- Botão de anexar arquivo (ícone `Paperclip`)
- Input file hidden que aceita imagens, PDFs e vídeos
- Preview dos arquivos selecionados (thumbnails para imagens, ícone+nome para outros)
- Botão de remover arquivo da lista
- Estado de upload com indicador de progresso
- Ao clicar "Enviar Resposta", primeiro faz upload dos arquivos via `upload-ticket-attachment`, depois envia o comentário com as URLs

## Fluxo do cliente

```text
Cliente abre ticket → Clica no ícone 📎 → Seleciona foto/PDF
→ Preview aparece abaixo do textarea
→ Clica "Enviar Resposta"
→ Upload do arquivo via edge function (progress bar)
→ Comentário salvo com attachments no JSON
→ Time interno vê o anexo na timeline do ticket
```

## Arquivos criados/modificados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/upload-ticket-attachment/index.ts` | **Novo** — Edge function para upload de arquivos do cliente |
| `supabase/functions/add-customer-comment/index.ts` | Adicionar suporte ao campo `attachments` no insert |
| `src/components/MyTicketDetail.tsx` | Adicionar UI de upload de arquivos com preview e progresso |
| Migration SQL | Garantir que bucket `ticket-attachments` existe com policies corretas |

## Impacto
- **Zero regressão**: comentários sem anexo continuam funcionando normalmente
- **Upgrade**: clientes passam a poder enviar fotos, PDFs e vídeos como evidência
- **Segurança**: upload via edge function com service role (cliente não precisa de auth), validação de tipo e tamanho no servidor
- **Alinhamento**: a UI de leitura de anexos já existe — agora completa o ciclo com a escrita


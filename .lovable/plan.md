

## Correção do Erro de Build (mux-embed)

### Problema
O `bun.lock` contém referências a `@mux/mux-player` e `mux-embed` que não existem no `package.json`. Isso causa o erro `mux-embed@workspace:* failed to resolve` e impede o build.

### Solução
Adicionar e imediatamente remover uma dependência dummy para forçar a regeneração do lockfile. Alternativa mais limpa: sobrescrever o `bun.lock` com conteúdo vazio para forçar recriação.

### Seção Técnica

| Ação | Detalhe |
|------|---------|
| Sobrescrever `bun.lock` | Gravar arquivo vazio para forçar regeneração completa pelo Bun |
| Validar | Confirmar que o build passa sem erro |

Nenhuma feature é afetada — apenas o lockfile é regenerado.

### Sobre testar a feature
Após o build passar, você poderá testar enviando mensagens via WhatsApp. O motor vai:
1. Verificar cada regra na ordem configurada
2. Se a mensagem contiver alguma palavra-chave de uma regra, seguir aquele caminho
3. Se nenhuma regra bater, seguir pelo caminho "Outros"

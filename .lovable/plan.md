

# Auditoria: Limpar consultant_id de não-consultores

Analisei o projeto atual e sigo as regras da base de conhecimento.

## Situação atual

| Usuário | Role | Contatos vinculados | Ação |
|---------|------|----:|------|
| Fernanda | sales_rep | 1.424 | **LIMPAR** |
| Loriani Vitoria | sales_rep | 1.178 | **LIMPAR** |
| Paulo Lopes | consultant | 906 | Manter |
| Danielle Martins | consultant | 905 | Manter |
| Luiz Henrique | consultant | 902 | Manter |
| Thaynara Cruz | sales_rep | 789 | **LIMPAR** |
| Bruno | sales_rep | 743 | **LIMPAR** |
| Ronildo | consultant | 356 | Manter |
| Camila de Farias | sales_rep | 340 | **LIMPAR** |
| Ronildo Oliveira | admin | 2 | **LIMPAR** |

**Total a limpar: 4.476 contatos** (6 usuários não-consultores)

## Plano

Executar um UPDATE via insert tool para setar `consultant_id = NULL` em todos os contatos cujo `consultant_id` aponta para usuários que **não** têm role `consultant`:

- Fernanda (`c190047a...`) — 1.424 contatos
- Loriani (`522d898d...`) — 1.178 contatos
- Thaynara (`6e8c3566...`) — 789 contatos
- Bruno (`dfc475f0...`) — 743 contatos
- Camila (`de03d434...`) — 340 contatos
- Ronildo Oliveira (`697a5d4e...`) — 2 contatos

Após a limpeza, esses contatos passarão pelo fluxo normal de IA/Chat Flow na próxima interação, em vez de serem roteados diretamente para pessoas que não são consultoras.

As validações no backend (`update-user` e `bulk-import-contacts`) já foram implementadas na mensagem anterior para impedir que isso ocorra novamente.


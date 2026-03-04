

# Plan: Incluir Senha Temporária no Email de Criação de Usuário

## Diagnóstico

- **`create-user`**: Recebe `password` do body, cria o usuário, mas o email **não inclui a senha** — mostra apenas "Utilize o link abaixo" com link para `/setup-password` (que exige autenticação prévia → falha).
- **`resend-welcome-email`**: Já funciona corretamente — gera nova senha e a inclui no email, com link para `/auth`.

## Solução

Alterar apenas **`supabase/functions/create-user/index.ts`** — o template HTML do email:

1. **Adicionar a senha temporária** no card de credenciais (variável `password` já está disponível no escopo)
2. **Mudar o link** do botão de `/setup-password` → `/auth`
3. **Ajustar o texto** do botão para "Acessar o Sistema" e o aviso para indicar que a troca de senha será solicitada automaticamente no primeiro login

## Mudança específica (linhas ~303-320)

```html
<!-- Card de credenciais: adicionar senha -->
<p><strong>Sistema:</strong> https://parabellum.work</p>
<p><strong>Login:</strong> ${email}</p>
<p><strong>Senha Temporária:</strong> ${password}</p>
<p style="color: #dc2626;">(Troca obrigatória no primeiro login)</p>

<!-- Botão: mudar link e texto -->
<a href="https://parabellum.work/auth">Acessar o Sistema</a>

<!-- Aviso: atualizar instrução -->
"No primeiro acesso, você será solicitado a definir uma nova senha por segurança."
```

## Impacto
- Zero regressão: fluxo de `must_change_password` continua intacto
- `resend-welcome-email` não precisa de alteração (já está correto)
- 1 arquivo modificado: `supabase/functions/create-user/index.ts`


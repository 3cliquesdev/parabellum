

# Adicionar email de boas-vindas após criação do auth user no kiwify-webhook

## O que será feito

Após o bloco `supabase.auth.admin.createUser` (linhas 1139-1158), inserir um bloco `try/catch` independente que:

1. Gera um link de recovery via `supabase.auth.admin.generateLink()` com `redirectTo` apontando para `/client-portal`
2. Chama `supabase.functions.invoke('send-email')` com o email de boas-vindas formatado em HTML
3. Se falhar, loga o erro e continua — não quebra o fluxo

## Detalhes técnicos

### Variáveis já disponíveis no contexto (linha ~1103):
- `Customer.email` → email
- `nameParts[0]` → primeiro nome
- `Product.product_name` → nome do produto
- `contact.id` → customer_id para o send-email

### Bloco a inserir após linha 1158 (fim do try/catch do auth):

```typescript
// 2.1 📧 Email de boas-vindas com link de primeiro acesso
try {
  const customerFirstName = nameParts[0];
  const frontendUrl = Deno.env.get('FRONTEND_URL') || 'https://nexxoai.lovable.app';

  const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
    type: 'recovery',
    email: Customer.email,
    options: {
      redirectTo: `${frontendUrl}/client-portal`
    }
  });

  if (linkError || !linkData?.properties?.action_link) {
    console.error('[kiwify-webhook] ⚠️ Failed to generate recovery link:', linkError);
  } else {
    const actionLink = linkData.properties.action_link;
    
    await supabase.functions.invoke('send-email', {
      body: {
        to: Customer.email,
        to_name: customerFirstName,
        subject: `✅ Seu acesso ao portal está pronto, ${customerFirstName}!`,
        html: `<h2>Olá, ${customerFirstName}!</h2>
<p>Sua compra do <strong>${Product.product_name}</strong> foi confirmada.</p>
<p>Criamos seu acesso ao portal do cliente onde você pode acompanhar seus tickets, devoluções e progresso do onboarding.</p>
<h3>Seus dados de acesso:</h3>
<ul>
  <li><strong>Login:</strong> ${Customer.email}</li>
  <li><strong>Produto:</strong> ${Product.product_name}</li>
  <li><strong>Senha:</strong> clique no botão abaixo para definir sua senha</li>
</ul>
<p style="text-align: center; margin: 30px 0;">
  <a href="${actionLink}" style="background-color: #2c5282; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Definir minha senha e acessar o portal</a>
</p>
<p style="color: #888; font-size: 13px;">O link expira em 24 horas.</p>
<hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
<p style="color: #999; font-size: 12px; text-align: center;">© Seu Armazém Drop — Todos os direitos reservados</p>`,
        customer_id: contact.id,
        is_customer_email: true,
      }
    });

    console.log('[kiwify-webhook] ✅ Welcome email sent to:', Customer.email);
  }
} catch (welcomeEmailErr) {
  console.error('[kiwify-webhook] ⚠️ Welcome email failed (non-blocking):', welcomeEmailErr);
}
```

### Arquivo modificado
- `supabase/functions/kiwify-webhook/index.ts` — inserção após linha 1158
- Redeploy automático da edge function




## Adicionar Card "WhatsApp Meta API" na Tela de Configuracoes

### Problema

A pagina `/settings/whatsapp-meta` (com gerenciamento de instancias Meta e templates HSM) existe e funciona, mas nao ha nenhum link/card na tela de Configuracoes (`/settings`) para acessar.

### Solucao

Adicionar um novo `SettingsCard` na secao "Canais de Comunicacao" do arquivo `src/pages/Settings.tsx`, logo abaixo do card "WhatsApp" existente.

### Detalhes Tecnicos

**Arquivo**: `src/pages/Settings.tsx`

- Adicionar um novo card na secao "Canais de Comunicacao" (linha ~112):

```
<SettingsCard
  icon={MessageCircle}
  iconBgColor="bg-green-600"
  title="WhatsApp Meta API"
  description="Cloud API e Templates HSM"
  onClick={() => navigate('/settings/whatsapp-meta')}
/>
```

- O card ficara entre o "WhatsApp" (Evolution) e o "Instagram"
- Nenhum outro arquivo precisa ser alterado — a rota ja existe em `App.tsx` (linha 243)

### Impacto

- Zero impacto em funcionalidades existentes
- Apenas adiciona um ponto de acesso visual que estava faltando


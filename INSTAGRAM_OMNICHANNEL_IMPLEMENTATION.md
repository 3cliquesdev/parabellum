# Instagram Omnichannel Implementation

## Objective

This document explains how the Instagram omnichannel integration was implemented in Liberty CRM so the same approach can be reproduced in another system.

Scope of this v1:

- Instagram DM inbound
- Inbox conversation creation/continuation
- AI + flow engine reuse
- Human handoff
- Manual human replies from the inbox
- No advanced channel analytics
- No generic public inbound webhook

## High-Level Architecture

The integration is split into 4 layers:

1. Meta channel configuration
2. Inbound webhook adapter
3. Shared conversational pipeline
4. Inbox outbound sending

### 1. Meta channel configuration

Tenant-specific Instagram credentials are stored in `instagram_configs`.

File:

- [supabase/migrations/025_instagram_channel.sql](C:/Users/euron/Documents/liberty-crm/supabase/migrations/025_instagram_channel.sql)

Table:

- `tenant_id`
- `page_id`
- `instagram_business_account_id`
- `access_token`
- `verify_token`
- `username`
- `active`

### 2. Inbound webhook adapter

Instagram events arrive in:

- [src/app/api/webhooks/instagram/route.ts](C:/Users/euron/Documents/liberty-crm/src/app/api/webhooks/instagram/route.ts)

Responsibilities:

- verify Meta webhook challenge
- parse Meta payload
- resolve tenant using `instagram_configs`
- normalize sender/message data
- call the shared inbound automation pipeline

### 3. Shared conversational pipeline

The reusable pipeline lives in:

- [src/lib/omnichannel/inbound-automation.ts](C:/Users/euron/Documents/liberty-crm/src/lib/omnichannel/inbound-automation.ts)

Responsibilities:

- create or match lead
- create or continue conversation
- persist inbound message
- dispatch outgoing CRM webhooks
- run flow engine
- detect handoff intent / negative sentiment
- route to human queue when needed
- run AI autopilot/copilot

### 4. Inbox outbound sending

Manual human replies are handled by:

- [src/app/api/inbox/send/route.ts](C:/Users/euron/Documents/liberty-crm/src/app/api/inbox/send/route.ts)
- [src/lib/inbox/outbound.ts](C:/Users/euron/Documents/liberty-crm/src/lib/inbox/outbound.ts)

For Instagram, outbound uses:

- `page_id`
- `access_token`
- `lead_identities.external_id` as the recipient ID

## Key Files

### Meta channel helpers

- [src/lib/meta-channel.ts](C:/Users/euron/Documents/liberty-crm/src/lib/meta-channel.ts)

Includes:

- `sendInstagramTextMessage`
- `sendWhatsAppTextMessage`
- `sendWhatsAppAudioMessage`
- `fetchAndStoreWhatsAppMedia`

### Flow engine decoupling

- [src/lib/flow-engine.ts](C:/Users/euron/Documents/liberty-crm/src/lib/flow-engine.ts)

Important change:

- the flow engine no longer sends messages directly through WhatsApp
- it now receives a generic `sendText(text)` callback

This is what makes the same flow engine reusable for Instagram.

### Inbox identity resolution

- [src/lib/inbox/channels.ts](C:/Users/euron/Documents/liberty-crm/src/lib/inbox/channels.ts)

Important change:

- if `valor` is missing, Instagram conversations can still show a usable label using `external_id`

## Data Model

### Required existing tables

The integration assumes the system already has:

- `tenants`
- `leads`
- `lead_identities`
- `conversas`
- `mensagens`
- `atividades`
- `tenant_members`
- optional AI tables like `personas`, `agent_routing_rules`, `chat_flows`, `chat_flow_states`

### Instagram-specific mapping

Inbound Instagram sender mapping works like this:

- `lead_identities.canal = 'instagram'`
- `lead_identities.external_id = sender_id from Meta`
- `lead_identities.valor` may be null if username is unavailable

This is important because manual outbound replies rely on `external_id`.

## Meta Requirements

### Required permissions

The token used for the integration must include:

- `instagram_basic`
- `instagram_manage_messages`
- `pages_show_list`
- `pages_read_engagement`
- `business_management`

### Required identifiers

To save the integration in the CRM, these 3 values are needed:

1. `Page ID`
2. `Instagram Business Account ID`
3. `Access Token`

Notes:

- `Page ID` is the Facebook Page connected to the Instagram professional account
- `Instagram Business Account ID` is not the App ID
- `App ID` is not used in the Liberty channel configuration form

### Webhook values

The Meta app webhook must point to:

- callback URL: `https://liberty-crm-three.vercel.app/api/webhooks/instagram`
- verify token: the same token shown in the CRM integration panel

### Important Meta limitation

For real Instagram DM webhook delivery, the Meta app must be published/live according to the current Meta requirements shown in the app dashboard.

## CRM Configuration Flow

In the CRM UI:

- `Settings -> Integracoes -> Instagram`

User fills:

- `Page ID`
- `Instagram Business Account ID`
- `Access Token`

Routes involved:

- [src/app/api/instagram/config/route.ts](C:/Users/euron/Documents/liberty-crm/src/app/api/instagram/config/route.ts)
- [src/app/api/instagram/status/route.ts](C:/Users/euron/Documents/liberty-crm/src/app/api/instagram/status/route.ts)

The UI lives in:

- [src/app/(app)/settings/page.tsx](C:/Users/euron/Documents/liberty-crm/src/app/(app)/settings/page.tsx)

## Inbound Flow

When a DM arrives:

1. Meta calls `/api/webhooks/instagram`
2. the route extracts:
   - `pageId`
   - `senderId`
   - `messageId`
   - `text`
3. the route looks up the tenant in `instagram_configs`
4. it calls `handleInboundAutomation(...)`
5. the pipeline:
   - resolves or creates lead
   - resolves or creates conversation
   - stores the inbound message
   - dispatches outbound CRM webhooks like `message.received`
   - runs chat flow
   - runs AI
   - triggers human handoff when needed

## Manual Outbound Reply Flow

When a human replies in the inbox:

1. frontend posts to `/api/inbox/send`
2. backend loads conversation data
3. if channel is `instagram`:
   - it loads `instagram_configs`
   - it loads `lead_identities.external_id`
   - it sends text through Meta using `/{page_id}/messages`
4. it stores the outbound human message in `mensagens`

## WhatsApp Reuse Strategy

A major part of this implementation was not "adding Instagram", but extracting WhatsApp-specific business logic into shared channel-agnostic logic.

What stayed adapter-specific:

- Meta payload parsing
- media fetching
- channel send API
- webhook verification

What became shared:

- lead matching/creation
- conversation creation
- message persistence
- webhook dispatch
- flow execution
- AI routing
- handoff logic

## Required Environment Variables

At minimum:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

For webhook verification:

- `INSTAGRAM_VERIFY_TOKEN`

Fallback currently used by Liberty:

- if `INSTAGRAM_VERIFY_TOKEN` is absent, fallback may use `WHATSAPP_VERIFY_TOKEN`

For AI:

- `GOOGLE_SERVICE_ACCOUNT_JSON`

## API Endpoints Added or Used

### Added

- `GET/POST /api/webhooks/instagram`
- `POST/DELETE /api/instagram/config`
- `GET /api/instagram/status`

### Reused

- `POST /api/inbox/send`
- `POST /api/inbox/intake`
- `POST /api/webhooks/whatsapp`

## Test Checklist

### Technical test without Meta live traffic

1. Save a valid `instagram_config`
2. Simulate a webhook POST to `/api/webhooks/instagram`
3. Confirm:
   - a lead is created or matched
   - a conversation is created or reused
   - a message appears in the inbox

### Meta verification test

1. Call webhook challenge
2. Confirm `200` and returned challenge value

### Full manual reply test

1. Open inbox conversation with channel `instagram`
2. Send a manual text reply
3. Confirm:
   - message is accepted by `/api/inbox/send`
   - message is stored in `mensagens`
   - Meta returns success

### AI / flow test

1. Send a simulated or real DM
2. Confirm:
   - flow engine triggers if keyword matches
   - AI responds when enabled
   - handoff happens on human intent or negative sentiment

## Known Risks / Operational Notes

- If the Meta app is still under review or not live, real webhook delivery may be blocked.
- If the Instagram account is not properly linked to a Facebook Page, `Page ID` discovery fails.
- If `lead_identities.external_id` is missing, manual outbound replies for Instagram cannot work reliably.
- If the token lacks the required Instagram/Page permissions, Page lookup and messaging requests will fail.

## Reproducing in Another System

If you want to copy this integration into another CRM/app, the minimum pattern is:

1. Create `instagram_configs`
2. Add `lead_identities` support for `instagram` with `external_id`
3. Build `/api/webhooks/instagram`
4. Build a shared inbound pipeline
5. Decouple the flow engine from a single channel
6. Add outbound send support using `page_id + access_token + recipient_id`
7. Add UI for tenant-level configuration

If the target system already has:

- leads
- conversations
- messages
- automation
- AI

then the only truly Instagram-specific pieces are:

- Meta config storage
- webhook adapter
- Meta outbound send adapter
- recipient identity mapping

## Liberty-Specific Production Status

At the time of writing, Liberty CRM already has this front implemented and deployed in production, including:

- inbound Instagram adapter
- shared omnichannel pipeline
- inbox manual replies for Instagram
- tenant configuration UI
- migration for `instagram_configs`


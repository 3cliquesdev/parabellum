// pg-boss não é usado diretamente no Next.js (serverless)
// O worker é implementado como API route fire-and-forget
// Esta lib é mantida para referência futura

export const QUEUES = {
  BROADCAST_PROCESS_CAMPAIGN: "broadcast.process-campaign",
} as const;

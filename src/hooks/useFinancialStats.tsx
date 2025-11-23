import { useDeals } from "./useDeals";

export function useFinancialStats() {
  const { data: deals, isLoading } = useDeals();

  if (isLoading || !deals) {
    return {
      collected: 0,
      spent: 0,
      balance: 0,
      isLoading: true,
    };
  }

  // Calcular arrecadado (negócios ganhos)
  const collected = deals
    .filter((deal) => deal.status === "won")
    .reduce((sum, deal) => sum + (deal.value || 0), 0);

  // Calcular gasto estimado (30% dos negócios ativos)
  const spent = deals
    .filter((deal) => deal.status === "open")
    .reduce((sum, deal) => sum + (deal.value || 0) * 0.3, 0);

  const balance = collected - spent;

  return {
    collected,
    spent,
    balance,
    isLoading: false,
  };
}

import { useDeals } from "./useDeals";

export function usePipelineValue() {
  const { data: deals, isLoading } = useDeals();

  if (isLoading || !deals) {
    return {
      totalPipelineValue: 0,
      weightedValue: 0,
      isLoading: true,
    };
  }

  // Filtrar apenas deals abertos
  const openDeals = deals.filter((deal) => deal.status === "open");

  // Calcular valor total no pipeline
  const totalPipelineValue = openDeals.reduce(
    (sum, deal) => sum + (deal.value || 0),
    0
  );

  // Calcular valor ponderado (valor * probabilidade)
  const weightedValue = openDeals.reduce(
    (sum, deal) => sum + (deal.value || 0) * ((deal.probability || 50) / 100),
    0
  );

  return {
    totalPipelineValue,
    weightedValue,
    isLoading: false,
  };
}

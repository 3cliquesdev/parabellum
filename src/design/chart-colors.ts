/**
 * Design System Enterprise - Parabellum CRM
 * Paleta de cores oficial para gráficos Recharts
 * 
 * USO:
 * import { chartColors, getChartColor } from "@/design/chart-colors";
 * 
 * <Bar fill={chartColors.primary} />
 * <Line stroke={getChartColor(0)} />
 */

// Cores primárias para gráficos (consistentes com o Design System)
export const chartColors = {
  // Cores principais
  primary: "hsl(221.2, 83.2%, 53.3%)",      // Tech Blue
  primaryLight: "hsl(221.2, 83.2%, 65%)",
  primaryDark: "hsl(221.2, 83.2%, 45%)",
  
  // Cores semânticas
  success: "hsl(142, 76%, 36%)",
  successLight: "hsl(142, 76%, 50%)",
  warning: "hsl(38, 100%, 50%)",
  warningLight: "hsl(38, 100%, 65%)",
  danger: "hsl(0, 84%, 60%)",
  dangerLight: "hsl(0, 84%, 75%)",
  info: "hsl(199, 89%, 48%)",
  infoLight: "hsl(199, 89%, 65%)",
  
  // Cores neutras
  muted: "hsl(215.4, 16.3%, 46.9%)",
  mutedLight: "hsl(215.4, 16.3%, 65%)",
  
  // Cores de canal
  whatsapp: "hsl(142, 70%, 49%)",
  instagram: "hsl(340, 75%, 50%)",
  email: "hsl(0, 0%, 45%)",
  chat: "hsl(221.2, 83.2%, 53.3%)",
} as const;

// Paleta sequencial para múltiplas séries de dados
export const chartPalette = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
  chartColors.info,
  chartColors.primaryLight,
  chartColors.successLight,
  chartColors.warningLight,
  chartColors.infoLight,
  chartColors.muted,
  chartColors.mutedLight,
] as const;

// Paleta para gráficos de comparação (2-3 séries)
export const comparisonPalette = [
  chartColors.primary,
  chartColors.success,
  chartColors.warning,
] as const;

// Paleta para status/estados
export const statusPalette = {
  positive: chartColors.success,
  negative: chartColors.danger,
  neutral: chartColors.muted,
  pending: chartColors.warning,
} as const;

// Paleta para receita/financeiro
export const financialPalette = {
  revenue: chartColors.success,
  expense: chartColors.danger,
  profit: chartColors.primary,
  projected: chartColors.primaryLight,
} as const;

// Função helper para obter cor por índice
export function getChartColor(index: number): string {
  return chartPalette[index % chartPalette.length];
}

// Função helper para gerar cores com opacidade
export function withOpacity(color: string, opacity: number): string {
  return color.replace(")", `, ${opacity})`).replace("hsl(", "hsla(");
}

// Gradientes para áreas
export const chartGradients = {
  primary: {
    start: withOpacity(chartColors.primary, 0.3),
    end: withOpacity(chartColors.primary, 0.05),
  },
  success: {
    start: withOpacity(chartColors.success, 0.3),
    end: withOpacity(chartColors.success, 0.05),
  },
  warning: {
    start: withOpacity(chartColors.warning, 0.3),
    end: withOpacity(chartColors.warning, 0.05),
  },
} as const;

export type ChartColorKey = keyof typeof chartColors;
export type ChartPaletteIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

import * as XLSX from "xlsx";
import { format } from "date-fns";

interface DailyRow {
  date: string;
  leads: number;
  won: number;
  lost: number;
  conversionRate: number;
  revenue: number;
}

export function useExportFormLeadsExcel() {
  const exportToExcel = (dailyData: DailyRow[], kpis: { totalLeads: number; totalWon: number; totalLost: number; conversionRate: number; totalRevenue: number }) => {
    const rows = dailyData.map((d) => ({
      Data: d.date,
      "Leads Criados": d.leads,
      "Deals Ganhos": d.won,
      "Deals Perdidos": d.lost,
      "Taxa Conversão (%)": d.conversionRate,
      "Receita (R$)": d.revenue,
    }));

    rows.push({
      Data: "TOTAL",
      "Leads Criados": kpis.totalLeads,
      "Deals Ganhos": kpis.totalWon,
      "Deals Perdidos": kpis.totalLost,
      "Taxa Conversão (%)": kpis.conversionRate,
      "Receita (R$)": kpis.totalRevenue,
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads vs Conversão");

    const colWidths = [
      { wch: 12 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 14 },
    ];
    ws["!cols"] = colWidths;

    const fileName = `leads-vs-conversao-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return { exportToExcel };
}

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface XMLReportData {
  periodo: { inicio: Date; fim: Date };
  resumo: {
    dealsCreados: number;
    dealsGanhos: number;
    dealsAbertos: number;
    dealsPerdidos: number;
    taxaConversao: string;
  };
  receita: {
    bruta: number;
    liquida: number;
  };
  clientes: {
    total: number;
    novos: number;
    recorrentes: number;
  };
  categorias?: Array<{ nome: string; deals: number; receita: number }>;
  produtos?: Array<{ nome: string; vendas: number; bruto: number; liquido: number }>;
  vendedores?: Array<{ nome: string; deals: number; receita: number }>;
}

interface ExportXMLOptions {
  filename?: string;
  title?: string;
}

function escapeXML(str: string | number | undefined): string {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  }).format(value);
}

function buildXMLString(data: XMLReportData, title: string): string {
  const periodoInicio = format(data.periodo.inicio, "dd/MM/yyyy", { locale: ptBR });
  const periodoFim = format(data.periodo.fim, "dd/MM/yyyy", { locale: ptBR });
  const geradoEm = new Date().toISOString();

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<RelatorioVendas titulo="${escapeXML(title)}" geradoEm="${geradoEm}" periodo="${periodoInicio} - ${periodoFim}">\n`;

  // Resumo
  xml += `  <Resumo>\n`;
  xml += `    <DealsCreados>${data.resumo.dealsCreados}</DealsCreados>\n`;
  xml += `    <DealsGanhos>${data.resumo.dealsGanhos}</DealsGanhos>\n`;
  xml += `    <DealsAbertos>${data.resumo.dealsAbertos}</DealsAbertos>\n`;
  xml += `    <DealsPerdidos>${data.resumo.dealsPerdidos}</DealsPerdidos>\n`;
  xml += `    <TaxaConversao>${escapeXML(data.resumo.taxaConversao)}</TaxaConversao>\n`;
  xml += `  </Resumo>\n`;

  // Receita
  xml += `  <Receita>\n`;
  xml += `    <Bruta valor="${data.receita.bruta}">${escapeXML(formatCurrency(data.receita.bruta))}</Bruta>\n`;
  xml += `    <Liquida valor="${data.receita.liquida}">${escapeXML(formatCurrency(data.receita.liquida))}</Liquida>\n`;
  xml += `  </Receita>\n`;

  // Clientes
  xml += `  <Clientes>\n`;
  xml += `    <Total>${data.clientes.total}</Total>\n`;
  xml += `    <Novos>${data.clientes.novos}</Novos>\n`;
  xml += `    <Recorrentes>${data.clientes.recorrentes}</Recorrentes>\n`;
  xml += `  </Clientes>\n`;

  // Por Categoria
  if (data.categorias && data.categorias.length > 0) {
    xml += `  <PorCategoria>\n`;
    for (const cat of data.categorias) {
      xml += `    <Categoria nome="${escapeXML(cat.nome)}" deals="${cat.deals}" receita="${cat.receita}" receitaFormatada="${escapeXML(formatCurrency(cat.receita))}" />\n`;
    }
    xml += `  </PorCategoria>\n`;
  }

  // Por Produto
  if (data.produtos && data.produtos.length > 0) {
    xml += `  <PorProduto>\n`;
    for (const prod of data.produtos) {
      xml += `    <Produto nome="${escapeXML(prod.nome)}" vendas="${prod.vendas}" bruto="${prod.bruto}" liquido="${prod.liquido}" brutoFormatado="${escapeXML(formatCurrency(prod.bruto))}" liquidoFormatado="${escapeXML(formatCurrency(prod.liquido))}" />\n`;
    }
    xml += `  </PorProduto>\n`;
  }

  // Por Vendedor
  if (data.vendedores && data.vendedores.length > 0) {
    xml += `  <PorVendedor>\n`;
    for (const vend of data.vendedores) {
      xml += `    <Vendedor nome="${escapeXML(vend.nome)}" deals="${vend.deals}" receita="${vend.receita}" receitaFormatada="${escapeXML(formatCurrency(vend.receita))}" />\n`;
    }
    xml += `  </PorVendedor>\n`;
  }

  xml += `</RelatorioVendas>`;
  return xml;
}

function downloadXML(content: string, filename: string) {
  const blob = new Blob([content], { type: "application/xml;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${format(new Date(), "yyyy-MM-dd")}.xml`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function useExportXML() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToXML = useCallback(
    async (data: XMLReportData, options: ExportXMLOptions = {}) => {
      const { filename = "relatorio_vendas", title = "Relatório de Vendas e Assinaturas" } = options;
      setIsExporting(true);

      try {
        const xml = buildXMLString(data, title);
        downloadXML(xml, filename);
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  return { exportToXML, isExporting };
}

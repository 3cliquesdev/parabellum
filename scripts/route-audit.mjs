#!/usr/bin/env node
/**
 * Script de Auditoria de Rotas
 * 
 * Varre src/pages e gera route-map.json com todas as páginas e suas rotas sugeridas.
 * 
 * Uso: node scripts/route-audit.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "../src/pages");

const results = [];

function walk(dir, basePath = "") {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const relativePath = path.join(basePath, entry.name);
    
    if (entry.isDirectory()) {
      walk(full, relativePath);
    } else if (/\.(tsx|jsx)$/.test(entry.name)) {
      const name = entry.name.replace(/\.(tsx|jsx)$/, "");
      
      // Gerar rota sugerida baseada no nome do arquivo
      let suggestedPath = "/" + relativePath
        .replace(/index\.(tsx|jsx)$/i, "")
        .replace(/\.(tsx|jsx)$/i, "")
        .replace(/\\/g, "/")
        .replace(/\/+/g, "/")
        .replace(/\/$/, "");
      
      // Normalizar para kebab-case
      suggestedPath = suggestedPath
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase();
      
      if (suggestedPath === "") suggestedPath = "/";
      
      // Verificar se tem export default
      const content = fs.readFileSync(full, "utf8");
      const hasDefaultExport = /export\s+default/.test(content);
      
      results.push({
        file: relativePath,
        component: name,
        suggestedPath,
        hasDefaultExport,
      });
    }
  }
}

try {
  walk(root);
  
  // Ordenar por path sugerido
  results.sort((a, b) => a.suggestedPath.localeCompare(b.suggestedPath));
  
  // Salvar JSON
  const outputPath = path.join(__dirname, "../route-map.json");
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  
  console.log(`\n✅ Auditoria de rotas concluída!`);
  console.log(`📁 Páginas encontradas: ${results.length}`);
  console.log(`📄 Arquivo gerado: route-map.json\n`);
  
  // Exibir resumo
  console.log("📊 Resumo:");
  console.log("─".repeat(60));
  console.log(`${"Arquivo".padEnd(30)} ${"Rota Sugerida".padEnd(25)} Export`);
  console.log("─".repeat(60));
  
  for (const r of results) {
    const exportStatus = r.hasDefaultExport ? "✅" : "⚠️";
    console.log(`${r.file.padEnd(30)} ${r.suggestedPath.padEnd(25)} ${exportStatus}`);
  }
  
  console.log("─".repeat(60));
  console.log(`\n⚠️  Páginas sem default export precisam ser verificadas.`);
  console.log(`📌 Compare route-map.json com as rotas em src/App.tsx\n`);
  
} catch (error) {
  console.error("❌ Erro ao auditar rotas:", error.message);
  process.exit(1);
}

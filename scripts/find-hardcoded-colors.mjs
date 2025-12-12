#!/usr/bin/env node
/**
 * Script para Detectar Cores Hardcoded
 * 
 * Varre src/ procurando cores HEX, RGB e RGBA que deveriam usar tokens do Tailwind.
 * 
 * Uso: node scripts/find-hardcoded-colors.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, "../src");

// Regex para detectar cores hardcoded
const colorPatterns = [
  { name: "HEX", regex: /#(?:[0-9a-fA-F]{3}){1,2}\b/g },
  { name: "HEX-8", regex: /#(?:[0-9a-fA-F]{8})\b/g },
  { name: "RGB", regex: /rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)/gi },
  { name: "RGBA", regex: /rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*[\d.]+\s*\)/gi },
];

// Extensões para verificar
const extensions = [".ts", ".tsx", ".jsx", ".js", ".css"];

// Cores permitidas (não são problemas)
const allowedColors = new Set([
  "#000", "#000000", "#fff", "#ffffff", // preto/branco básicos
  "#22c55e", // WhatsApp green (legado, verificar se ainda necessário)
]);

const findings = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    
    // Ignorar node_modules e .git
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    
    if (entry.isDirectory()) {
      walk(full);
    } else if (extensions.some(ext => full.endsWith(ext))) {
      checkFile(full);
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");
  const relativePath = path.relative(root, filePath);
  
  const fileFindings = [];
  
  lines.forEach((line, index) => {
    // Ignorar comentários
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    
    for (const pattern of colorPatterns) {
      const matches = line.match(pattern.regex);
      if (matches) {
        for (const match of matches) {
          // Ignorar cores permitidas
          if (allowedColors.has(match.toLowerCase())) continue;
          
          // Ignorar se está dentro de uma variável CSS (ex: hsl(var(--...)))
          if (line.includes("var(--")) continue;
          
          // Ignorar se está em um comentário inline
          const commentIndex = line.indexOf("//");
          if (commentIndex !== -1 && line.indexOf(match) > commentIndex) continue;
          
          fileFindings.push({
            line: index + 1,
            type: pattern.name,
            color: match,
            context: line.trim().substring(0, 80),
          });
        }
      }
    }
  });
  
  if (fileFindings.length > 0) {
    findings.push({
      file: relativePath,
      colors: fileFindings,
    });
  }
}

try {
  walk(root);
  
  console.log("\n🎨 Auditoria de Cores Hardcoded\n");
  console.log("═".repeat(70));
  
  if (findings.length === 0) {
    console.log("\n✅ Nenhuma cor hardcoded encontrada! Projeto está usando tokens.\n");
  } else {
    let totalColors = 0;
    
    for (const finding of findings) {
      console.log(`\n📁 ${finding.file}`);
      console.log("─".repeat(70));
      
      for (const color of finding.colors) {
        totalColors++;
        console.log(`  L${String(color.line).padStart(4)}: ${color.type.padEnd(6)} ${color.color.padEnd(12)} → ${color.context}`);
      }
    }
    
    console.log("\n" + "═".repeat(70));
    console.log(`\n⚠️  Total: ${totalColors} cores hardcoded em ${findings.length} arquivos`);
    console.log("\n💡 Recomendação: Substitua por tokens do Tailwind:");
    console.log("   - #ffffff → bg-background ou text-foreground");
    console.log("   - #2563eb → bg-primary ou text-primary");
    console.log("   - rgb(...)  → Use hsl(var(--token))");
    console.log("");
  }
  
} catch (error) {
  console.error("❌ Erro ao auditar cores:", error.message);
  process.exit(1);
}

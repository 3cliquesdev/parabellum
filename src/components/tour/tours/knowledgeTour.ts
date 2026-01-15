import { TourStep } from "../TourProvider";

export const KNOWLEDGE_TOUR_ID = "knowledge-v1";

export const KNOWLEDGE_TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="knowledge-brain-status"]',
    title: "🧠 Status da IA",
    content: "Veja o status do treinamento da IA: quantidade de artigos, embeddings gerados e qualidade da busca semântica.",
  },
  {
    target: '[data-tour="knowledge-search"]',
    title: "🔍 Buscar Artigos",
    content: "Busque artigos por título ou conteúdo. A busca funciona com IA semântica quando os embeddings estão gerados.",
  },
  {
    target: '[data-tour="knowledge-create-button"]',
    title: "➕ Novo Artigo",
    content: "Crie um novo artigo de conhecimento. Adicione título, categoria, tags e conteúdo formatado.",
  },
  {
    target: '[data-tour="knowledge-import-button"]',
    title: "📥 Importar Base",
    content: "Importe múltiplos artigos de uma vez via arquivo. Útil para migrar bases de conhecimento existentes.",
  },
  {
    target: '[data-tour="knowledge-generate-embeddings"]',
    title: "✨ Gerar Embeddings",
    content: "Gere embeddings para habilitar busca semântica por IA. A IA encontra artigos relevantes mesmo com palavras diferentes.",
  },
];

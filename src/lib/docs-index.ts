/**
 * Static index of docs/ — mirrors docs/README.md by hand instead of scanning
 * the filesystem, so each entry can carry a human title/description and the
 * index order is deliberate, not alphabetical.
 */

export type DocEntry = {
  slug: string; // path under docs/, without the .md extension
  title: string;
  description: string;
};

/** Named accent used for the category's card color and icon badge in the docs index — kept as a token, not a raw color, so the palette stays centralized in one place (see ACCENT_CLASSES in the index page). */
export type DocAccent = "blue" | "teal" | "amber" | "violet" | "slate";

export type DocCategory = {
  id: string;
  label: string;
  description: string;
  accent: DocAccent;
  entries: DocEntry[];
};

export const DOC_CATEGORIES: DocCategory[] = [
  {
    id: "produto",
    label: "Produto",
    description: "O que é o MedCheck, como o pipeline funciona, e os termos usados no produto.",
    accent: "blue",
    entries: [
      { slug: "produto/visao-geral", title: "Visão geral", description: "O que é o MedCheck, para quem, e o que o produto nunca faz" },
      { slug: "produto/como-funciona", title: "Como funciona", description: "O pipeline completo, etapa por etapa" },
      { slug: "produto/glossario", title: "Glossário", description: "Todo termo técnico e jurídico usado no produto" },
    ],
  },
  {
    id: "analista",
    label: "Analista",
    description: "Como operar a fila, revisar um caso, contatar uma clínica e emitir um parecer.",
    accent: "teal",
    entries: [
      { slug: "analista/manual-do-analista", title: "Manual do analista", description: "Como revisar um caso e emitir o parecer" },
      { slug: "analista/checklist-avaliacao", title: "Checklist de avaliação por sinal", description: "O que cada resultado de verificação significa, e o que fazer com ele" },
      { slug: "analista/roteiros-de-contato", title: "Roteiros de contato com clínica/instituição", description: "Falas prontas por telefone e WhatsApp, e as perguntas certas para cada situação" },
      { slug: "analista/casos-de-estudo/README", title: "Casos de estudo", description: "Casos simulados (claramente marcados) para estudar o método — e onde os reais entram quando acontecerem" },
    ],
  },
  {
    id: "vendas",
    label: "Vendas",
    description: "Como apresentar, gerar necessidade de verdade, e responder objeção sem ser defensivo.",
    accent: "amber",
    entries: [
      { slug: "vendas/playbook-comercial", title: "Playbook comercial", description: "A ordem que funciona numa reunião, do gancho ao fechamento" },
      { slug: "vendas/roteiro-de-abordagem", title: "Roteiro de abordagem", description: "Falas prontas por fase da conversa, com as perguntas que criam a necessidade" },
      { slug: "vendas/psicologia-da-venda", title: "Psicologia da venda", description: "O princípio psicológico por trás de cada fala, mapeado por etapa da reunião" },
      { slug: "vendas/personas-de-cliente", title: "Personas de cliente", description: "Quatro clientes fictícios, mas realistas — a voz de cada perfil antes de entrar na sala" },
      { slug: "vendas/niveis-de-cliente", title: "Níveis de cliente", description: "Segmentação, gatilho emocional real de cada perfil, e qual post usar" },
      { slug: "vendas/gatilhos-e-objecoes", title: "Gatilhos e objeções", description: "Os três medos que realmente vendem, e como responder objeção real" },
      { slug: "vendas/precificacao", title: "Precificação", description: "Onde os planos e o modelo de custo vivem hoje" },
    ],
  },
  {
    id: "decisoes",
    label: "Decisões",
    description: "Registro de decisões de produto e negócio, com o porquê.",
    accent: "violet",
    entries: [
      { slug: "decisoes/log-de-decisoes", title: "Log de decisões", description: "Registro cronológico, mais recente no topo" },
      { slug: "decisoes/comparativo-provedores-cobranca", title: "Comparativo de provedores de cobrança", description: "Por que Asaas, comparado de verdade contra as alternativas" },
    ],
  },
  {
    id: "operacional",
    label: "Operacional",
    description: "O que ainda depende de uma ação externa (contas, chaves) fora do código.",
    accent: "slate",
    entries: [
      { slug: "acoes-externas-pendentes", title: "Ações externas pendentes", description: "O que só a Fernanda pode fazer, e o que acontece sem isso" },
    ],
  },
];

export function findDocEntry(slug: string): { entry: DocEntry; category: DocCategory } | null {
  for (const category of DOC_CATEGORIES) {
    const entry = category.entries.find((e) => e.slug === slug);
    if (entry) return { entry, category };
  }
  return null;
}

/**
 * Content for the live presentation deck (/ops/documentacao/apresentacao) —
 * condensed, screen-friendly version of roteiro-de-abordagem.md. Kept as
 * data (not hard-coded JSX) so updating a slide's words never touches the
 * rendering component.
 */

export type PitchTheme = "navy" | "warm" | "wine" | "cue" | "teal" | "blue" | "violet";

export type PitchSlide = {
  eyebrow: string;
  title: string;
  subtitle?: string;
  bullets?: string[];
  footer?: string;
  theme: PitchTheme;
};

export const PITCH_DECK: PitchSlide[] = [
  {
    eyebrow: "MedCheck",
    title: "Cada atestado, verificado de verdade.",
    subtitle: "Não só arquivado.",
    theme: "navy",
  },
  {
    eyebrow: "Pra começar",
    title: "Hoje, alguém confere isso de verdade?",
    subtitle: "Não é uma pergunta retórica — é a pergunta certa antes de qualquer slide de funcionalidade.",
    theme: "warm",
  },
  {
    eyebrow: "O problema real",
    title: "Aceitar demais é risco. Questionar demais também é.",
    bullets: [
      "Aceitar um atestado que não deveria ter sido aceito — risco de precedente.",
      "Recusar um atestado que era legítimo — passivo trabalhista por desconto indevido.",
    ],
    footer: "A decisão continua sendo da empresa. O que falta é informação pra decidir com segurança.",
    theme: "wine",
  },
  {
    eyebrow: "Pausa na apresentação",
    title: "Mostre o auto-preenchimento ao vivo",
    subtitle:
      "Suba um atestado de exemplo — nome, CPF e CRM preenchidos sozinhos em segundos. É o primeiro \"uau\" da reunião.",
    theme: "cue",
  },
  {
    eyebrow: "O que é real, não simulado",
    title: "Cada verificação consulta uma fonte de verdade.",
    bullets: [
      "CFM — cadastro próprio, verificado manualmente, médico por médico.",
      "Receita Federal — CNPJ da clínica, checado em tempo real.",
      "Ministério da Saúde (CNES) — cadastro nacional de estabelecimentos, importado em massa.",
    ],
    theme: "teal",
  },
  {
    eyebrow: "Diferenciais reais",
    title: "O que nenhuma ferramenta genérica de IA tem",
    bullets: [
      "Cadastro próprio de médicos verificados — mais de 100 mil registros, crescendo estado por estado.",
      "CNES nacional importado em massa — cobertura do Brasil inteiro.",
      "Toda decisão vem com a lista de sinais que a formaram — nunca uma nota sem explicação.",
      "LGPD nativo — CID mascarado por padrão, retenção automática, portal do titular.",
    ],
    theme: "blue",
  },
  {
    eyebrow: "Como decide",
    title: "O sistema nunca decide sozinho.",
    subtitle: "Score de 0 a 100, cada ajuste explicado — casos de risco sempre vão pra um analista antes de qualquer parecer.",
    theme: "violet",
  },
  {
    eyebrow: "O que isso resolve de verdade",
    title: "Não é sobre o atestado. É sobre ter resposta.",
    bullets: [
      "Medo de ser enganado.",
      "Medo de errar a decisão contrária — questionar quem não devia.",
      "Medo de não ter resposta se alguém perguntar como isso foi decidido.",
    ],
    footer: "O terceiro é o que mais pesa — e o que menos aparece nos discursos genéricos de \"antifraude\".",
    theme: "warm",
  },
  {
    eyebrow: "Como funciona o investimento",
    title: "Mensalidade-base + uso real, sem surpresa.",
    bullets: [
      "Starter — pra quem ainda não tem processo nenhum.",
      "Growth — pra quem já faz na mão e quer automatizar.",
      "Business/Enterprise — governança, SLA e integração com o RH já existente.",
    ],
    footer: "Valores atuais: simulador de planos ao vivo — nunca cite um número de memória.",
    theme: "violet",
  },
  {
    eyebrow: "Próximo passo",
    title: "Vamos rodar um piloto com o volume real de vocês?",
    subtitle: "Sem compromisso de contrato longo — a gente prova com os dados de vocês, não com uma demonstração genérica.",
    theme: "navy",
  },
];

# Precificação

## Onde os números vivem hoje

Dois Artifacts interativos, propositalmente separados por audiência:

- **Precificação MedCheck** (interna — custo, margem, nunca mostrar ao
  cliente) — https://claude.ai/code/artifact/f134cdd7-a7c7-476e-8944-36a17c0e923c
- **Planos MedCheck** (segura para mostrar ao cliente — só volume → preço,
  sem nenhuma informação de custo) — https://claude.ai/code/artifact/50e174b9-4a9d-4b72-9055-ed5872d04b36

## Os planos, resumidos

| Plano | Faixa de volume | Mensalidade-base | Por atestado |
|---|---|---|---|
| Starter | até ~150/mês | R$ 97 | R$ 1,90 |
| Growth | até ~800/mês | R$ 197 | R$ 1,50 |
| Business | acima de 800/mês | R$ 397 | R$ 1,20 |
| Enterprise | negociado | — | — |

**Estes números ainda estão sob revisão** — a Fernanda sinalizou que a
precificação vai passar por uma nova rodada de ajuste antes de ficar
definitiva. Até lá, os valores acima são o estado atual, não um preço
fechado — confira o Artifact "Precificação MedCheck" antes de cotar algo em
conversa real com cliente, porque pode já ter mudado lá sem esse arquivo ter
sido atualizado ainda.

## Como o modelo de custo funciona hoje

O custo considerado atualmente é só **Claude Vision** (extração de dados,
poucos centavos por documento graças ao cache) **+ infraestrutura fixa**
(Supabase/Vercel). Mão de obra de análise **não** está no cálculo — ainda
não é um custo direto do negócio, e a margem mostrada na calculadora interna
reflete isso. No dia em que revisão manual virar custo de verdade
(contratação de analista), essa linha volta a entrar — não esquecer de
atualizar tanto a calculadora quanto esta página quando isso acontecer.

## Como isso é efetivamente cobrado (mecanismo técnico)

Implementado — ver `/admin/billing`:

- **Mensalidade-base** — assinatura recorrente fixa via Asaas.
- **Uso variável** — faturado mensalmente por uma cobrança avulsa, somando o
  número real de atestados processados no mês anterior (não uma estimativa).

Ver `README.md` na raiz do repositório, seção "Cobrança", para o
funcionamento técnico completo.

## Sobre licença perpétua

Não recomendado como pagamento único puro — o raciocínio completo está no
Artifact "Precificação MedCheck", seção "E a licença perpétua?". Resumo: os
custos reais (IA, infraestrutura, e potencialmente mão de obra no futuro)
são recorrentes e escalam com uso; um pagamento único não cobre isso. Se um
cliente insistir em algo "perpétuo", a estrutura seria licença de entrada +
contrato de manutenção anual obrigatório + créditos de processamento — nunca
licença pura sem nenhuma recorrência.

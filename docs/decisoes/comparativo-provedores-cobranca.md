# Comparativo: por que Asaas, e não Vindi/Pagar.me/Iugu/Stripe

A escolha do Asaas (ver `log-de-decisoes.md`, 2026-08-18) foi revisitada em
2026-08-19 depois de uma pergunta direta: "é realmente a melhor opção?". Este
documento é a pesquisa real por trás da resposta — não uma justificativa
construída depois do fato.

## O que a MedCheck precisa de um provedor, especificamente

1. Cobrar uma **mensalidade fixa recorrente** (o plano) automaticamente.
2. Cobrar um **valor variável todo mês** (uso real), sem taxa fixa alta
   penalizando volume baixo no começo.
3. **Boleto e PIX nativos** — a imensa maioria dos clientes é empresa
   brasileira de médio porte, pagando fornecedor B2B recorrente; cartão
   internacional não é o método natural aqui.
4. **Sem mensalidade mínima da própria plataforma** — a MedCheck ainda está
   validando o próprio volume; um custo fixo alto de plataforma, cobrado
   independente de quanto (ou se) fatura, é o tipo de coisa que dói mais
   numa fase inicial do que depois.
5. Não precisa de split de pagamento (dividir automaticamente entre vários
   recebedores) — é um único recebedor, a própria MedCheck.

## Comparativo

| | Asaas | Vindi | Pagar.me | Iugu | Stripe (Brasil) |
|---|---|---|---|---|---|
| Mensalidade da plataforma | **Nenhuma** — só paga por cobrança recebida | R$ 299–699+/mês conforme plano | Varia por negociação | Varia por plano | Sem mensalidade, mas... |
| Boleto | Sem taxa de emissão; só cobra quando pago | ~2,49%+ por transação | Cobre, taxas por negociação | Cobre | Sem suporte nativo forte no Brasil |
| PIX | Sem taxa de emissão; R$0,99–1,99 só quando pago, 100 primeiras/mês grátis | ~2,99%+ por transação | Cobre | Cobre | **Convidados apenas** para empresas sediadas no Brasil — não disponível de forma geral hoje |
| Assinatura fixa + cobrança avulsa na mesma API | Sim, os dois nativos | Sim | Sim | Sim | Sim, mas sem PIX real no Brasil inviabiliza |
| Split de pagamento nativo | Disponível, mas não é nosso caso de uso | Destaque do produto | Disponível | Disponível | Disponível |
| Onboarding | Direto por CNPJ, sandbox grátis e imediato | Mais voltado a negociação/vendas | Mais voltado a negociação/vendas | Mais voltado a negociação/vendas | Onboarding internacional, mais fricção pra CNPJ brasileiro |

## A conclusão, sem enrolação

**Continua sendo Asaas — mas agora com uma razão mais específica do que
"é brasileiro": é o único da lista sem mensalidade fixa de plataforma
somada a taxas percentuais mais altas.** Vindi, especificamente, seria uma
péssima escolha agora — R$ 299/mês mínimo é um custo fixo real antes de
qualquer cliente pagar qualquer coisa, e o diferencial dela (split de
pagamento) não resolve nenhum problema que a MedCheck tem.

**Stripe fica descartado por um motivo concreto, não só "é internacional"**:
para empresas sediadas no Brasil, o PIX no Stripe está, hoje,
**disponível só por convite** — não é uma opção geral. Isso sozinho já
inviabiliza pra maioria dos clientes reais da MedCheck.

Pagar.me e Iugu são alternativas genuinamente competentes — API boa,
cobertura de linguagem ampla — mas nenhuma pesquisa encontrou um diferencial
concreto sobre o Asaas que justifique trocar, e ambas normalmente envolvem
negociação/proposta comercial em vez de um onboarding direto por CNPJ como
o Asaas oferece.

## Quando reconsiderar

Vale reabrir essa decisão se/quando:
- O volume de cobranças crescer a ponto de as taxas percentuais do Asaas
  pesarem mais que uma mensalidade fixa negociada em outro provedor.
- Surgir uma necessidade real de split de pagamento (ex.: repassar parte do
  valor para um parceiro/revendedor).
- O Asaas apresentar algum problema operacional real (instabilidade,
  suporte, taxa de recusa) que não apareceu nesta pesquisa.

Até lá, não há motivo concreto pra trocar — e trocar de provedor de
cobrança depois de clientes reais já estarem cadastrados tem custo próprio
(migração de assinaturas ativas), então essa não é uma decisão pra revisitar
por capricho.

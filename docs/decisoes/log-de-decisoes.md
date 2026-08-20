# Log de decisões

Registro cronológico de decisões de produto e negócio que vão durar mais
que uma conversa — o quê, por quê, e o que ficou descartado no caminho.
Mais recente no topo.

---

## 2026-08-20 — Cobrança de uso: acumula em vez de perder quando não atinge o mínimo da Asaas

**Decisão:** quando o uso variável do mês não atinge o valor mínimo que a
Asaas aceita por cobrança (R$ 10 boleto/PIX, R$ 5 cartão), a cobrança
daquele mês não é mais tentada e descartada — os registros de uso ficam
marcados como não faturados e entram na soma do(s) mês(es) seguinte(s),
até o total ultrapassar o mínimo.

**Por quê:** testando a ativação real da Asaas com valores pequenos (a
organização TESTE), ficou claro que `generateMonthlyInvoices()` tentava
cobrar todo mês e, se abaixo do mínimo, a chamada falhava e o uso daquele
mês específico nunca mais era contabilizado em lugar nenhum — dinheiro
real ficando pelo caminho silenciosamente. `UsageRecord` ganhou um campo
`invoiceId` (antes só existia `billedAt`, renomeado para `occurredAt` já
que não indicava mais cobrança) — só é considerado faturado quando de fato
compõe uma `Invoice` gerada com sucesso.

---

## 2026-08-20 — Pacote anual: fechado, sem medir uso por cima

**Decisão:** o pacote anual (`AnnualPackage`, novo modelo) é um valor
único negociado, parcelado via Asaas (cartão, boleto ou PIX), válido por
12 meses — sem cobrança de uso variável adicional durante a vigência.

**Por quê:** perguntada diretamente se o pacote deveria continuar medindo
uso por cima (modelo híbrido, mais justo pra cliente de alto volume, mais
complexo de calcular e comunicar) ou ser totalmente fechado, a Fernanda
escolheu fechado — mais simples de vender e de operar pra um primeiro
momento. Pode ser revisitado se um cliente de volume muito alto tornar o
modelo fechado desvantajoso para a empresa.

**Como:** modelado como modelo próprio, não como extensão de
`Subscription` — o ciclo de vida é fundamentalmente diferente (prazo fixo,
não renova sozinho, vs. recorrência indefinida da assinatura mensal).
Tecnicamente, é uma compra parcelada via `POST /v3/payments` da Asaas
(campos `totalValue` + `installmentCount`), não uma assinatura — Asaas não
tem um conceito nativo de "assinatura com fim programado".

---

## 2026-08-20 — Resolução de contestação: UI que faltava, construída junto com a documentação de suporte

**Decisão:** adicionar um painel de resolução de contestação
(`DisputePanel`) em `/ops/requests/[id]`, visível a qualquer analista e
com formulário de resolução para quem tem permissão de supervisor.

**Por quê:** ao escrever `suporte/manual-do-suporte.md`, ficou claro que a
action `resolveDispute` já existia no backend desde a fase anterior, mas
nenhuma tela chamava ela — um analista conseguia ver que uma contestação
existia (pela lista em `/ops/disputes`), mas não tinha como de fato
resolvê-la. Documentar um fluxo que não existia de verdade teria sido
descrição de intenção, não de produto — a opção certa foi fechar o
gap antes de escrever sobre ele.

---

## 2026-08-19 — Documentação interna: dentro do app, não só no repositório

**Decisão:** criar `/ops/documentacao`, uma tela dentro do próprio app que
lê e renderiza os arquivos de `docs/` — acessível a qualquer usuário interno
(analista, supervisor, admin), sem precisar de acesso ao repositório Git.

**Por quê:** a pasta `docs/` cresceu como material real de estudo (manual do
analista, roteiros de venda, comparativos), mas só existia como arquivo
Markdown no código-fonte — inútil na prática para quem opera a ferramenta
sem acesso ao repositório, como um analista recém-contratado. Motivado
diretamente por essa lacuna ao criar o primeiro usuário Supervisor
(Marilza) e perguntar se ela teria acesso a esse material.

**Como:** leitura de arquivo em tempo de execução (`fs.readFile`), com
`outputFileTracingIncludes` no `next.config.ts` para garantir que os `.md`
sejam empacotados no deploy da Vercel — sem isso, funcionaria em
desenvolvimento local e quebraria silenciosamente em produção.

---

## 2026-08-19 — Cobrança: decisão do Asaas revisitada e confirmada

**Decisão:** manter Asaas, depois de comparar de verdade contra Vindi,
Pagar.me, Iugu e Stripe — não só assumir que a primeira escolha estava
certa.

**Por quê:** Asaas é o único sem mensalidade fixa de plataforma (só cobra
por transação recebida) entre as opções pesquisadas — relevante numa fase
onde o volume ainda está sendo validado. Vindi tem mensalidade mínima de
~R$299/mês, um custo fixo real antes de qualquer receita. Stripe foi
descartado por um motivo concreto, não só preferência: PIX para empresas
sediadas no Brasil está disponível **só por convite** hoje, o que
inviabiliza pra maioria dos clientes reais da MedCheck.

Ver [comparativo-provedores-cobranca.md](comparativo-provedores-cobranca.md) para a pesquisa completa, incluindo
quando essa decisão merece ser revisitada.

---

## 2026-08-18 — Cobrança: Asaas, não Stripe

**Decisão:** usar Asaas (plataforma brasileira de cobrança recorrente) em
vez de Stripe puro para toda a infraestrutura de cobrança.

**Por quê:** todo cliente do MedCheck é uma empresa brasileira; Asaas é
boleto/PIX-first e tem onboarding nativo por CNPJ, o que combina melhor com
como empresas brasileiras de médio porte efetivamente pagam fornecedores
B2B recorrentes, comparado a um fluxo pensado primeiro para cartão
internacional.

**Descartado:** Stripe puro (bom produto, mas onboarding e meios de
pagamento pensados primeiro pra mercado internacional).

## 2026-08-18 — Mensalidade fixa + cobrança de uso separada

**Decisão:** a mensalidade-base é uma assinatura Asaas de valor fixo; o uso
variável (por atestado) é uma cobrança avulsa nova todo mês, somando os
`UsageRecord` reais do mês anterior.

**Por quê:** a API de assinaturas do Asaas só cobra valor fixo recorrente —
não existe "assinatura de valor variável" no produto deles. Separar em duas
cobranças foi a forma de manter os dois lados (previsibilidade da
mensalidade + cobrança justa por uso real) sem inventar uma solução por
cima da API do provedor.

## 2026-08-18 — RLS no Postgres: adiado, não descartado

**Decisão:** não implementar Row Level Security agora, apesar de estar no
radar desde o primeiro panorama do produto.

**Por quê:** o Prisma conecta com uma role que ignora RLS por definição do
Postgres (dona das tabelas) — criar políticas agora criaria falsa sensação
de proteção sem proteger nada de verdade. Implementar direito exige uma role
Postgres separada + uma extensão do Prisma injetando contexto de sessão por
requisição + tratamento explícito pros papéis internos que legitimamente
veem dados de múltiplas organizações. É projeto próprio, não um item de
lista de tarefas. Ver `README.md`, seção "Por que não tem RLS ainda", para o
detalhe técnico completo.

## 2026-08-18 — Fila real: Inngest

**Decisão:** mover o pipeline de validação (`runCertificateValidationWorkflow`)
de uma chamada síncrona dentro do request de upload para um evento
processado pelo Inngest, com `retries: 0`.

**Por quê:** rodar inline significava que uploads simultâneos competiam
pelos mesmos recursos (incluindo o pool de conexão do banco, que já mostrou
contenção real sob carga) e ficava exposto ao timeout de função do Vercel em
documentos maiores/mais lentos. `retries: 0` foi deliberado: o workflow não
é idempotente hoje (`ExtractedData.requestId` é único — uma retry após falha
parcial quebraria numa constraint, não redoria o trabalho). Tornar
retryable é trabalho futuro, registrado no README.

## 2026-08-18 — CNES: cadastro próprio importado, não API ao vivo

**Decisão:** verificar CNES via um cadastro próprio (`VerifiedClinic`),
importado em massa do dataset público do Ministério da Saúde, no mesmo
padrão já usado para médicos (`VerifiedDoctor`) — não uma consulta ao vivo.

**Por quê:** não existe uma API pública de consulta único-registro
confirmada e documentada para CNES. O Ministério da Saúde publica o cadastro
nacional completo como um dataset bulk (JSON, ~640MB, atualizado
diariamente) em dadosabertos.saude.gov.br — mesma lógica que já funciona
para o cadastro de médicos, e cobre o país inteiro de uma vez (diferente de
médicos, que depende de importação manual estado por estado).

## 2026-08-18 — Regras de decisão configuráveis: só os limiares, nunca os pesos

**Decisão:** permitir que uma organização configure os limiares de
recomendação (a partir de qual score auto-valida, pede revisão humana,
aciona contato ou escala pra supervisor) — mas não o peso de cada sinal
individual no cálculo do score.

**Por quê:** deixar um cliente ajustar o quão criterioso o sistema é com a
conta dele é uma necessidade real e legítima. Deixar um cliente ajustar
quanto um CRM divergente pesa no score, por exemplo, abriria espaço pra um
cliente "calibrar" o próprio resultado de forma que comprometeria a
integridade da análise — e da credibilidade do produto como um todo.

# Log de decisões

Registro cronológico de decisões de produto e negócio que vão durar mais
que uma conversa — o quê, por quê, e o que ficou descartado no caminho.
Mais recente no topo.

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

# Glossário

Todo termo técnico ou jurídico que aparece no produto, explicado uma vez só.
Quando um termo novo entrar em uso — no produto ou numa conversa com
cliente — o lugar certo pra definir é aqui.

## Termos médicos/regulatórios

**CRM** — Registro do médico no Conselho Regional de Medicina do seu
estado. Formato: número + UF (ex.: 123456/SP). É o identificador que o
MedCheck confirma contra o cadastro próprio de médicos verificados.

**CFM** — Conselho Federal de Medicina, o órgão regulador da profissão
médica no Brasil. Não tem API pública de consulta — por isso o MedCheck
mantém um cadastro próprio, verificado manualmente.

**CID** — Classificação Internacional de Doenças, o código que identifica o
diagnóstico. Dado de saúde sensível (LGPD Art. 5º, II) — mascarado por
padrão no MedCheck. Ver Resolução CFM 1658/2002: o paciente, não o médico
ou o empregador, decide se o CID aparece no atestado.

**CNES** — Cadastro Nacional de Estabelecimentos de Saúde, o registro do
Ministério da Saúde de toda unidade de saúde do país (hospitais, UBS, UPAs,
clínicas, laboratórios). O MedCheck importa esse cadastro em massa (não é
uma consulta ao vivo) e usa como enriquecimento sobre a verificação de CNPJ.

**CNPJ** — Cadastro Nacional da Pessoa Jurídica. Verificado em tempo real
contra a Receita Federal via BrasilAPI (gratuita, sem chave).

**Lei 605/1949, Art. 6º** — Define quais categorias de médico/instituição
podem emitir um atestado que garante o abono da falta sem desconto: médico
da empresa/convênio, perícia do INSS, médico do sindicato, ou **qualquer**
médico a serviço de unidade pública de saúde (SUS) — categoria ampla, não
uma exceção estreita.

**Resolução CFM 1658/2002** — Garante ao paciente o direito de pedir uma via
do atestado sem o CID visível. Ver post no blog: "O paciente decide se o CID
aparece no atestado".

**SUS** — Sistema Único de Saúde. Qualquer atendimento em unidade pública
(UBS, UPA, hospital público) se enquadra na categoria ampla do Art. 6º da
Lei 605/49 — não deve ser tratado como "fora de rede" ou menos confiável só
por não ser particular.

**CLT, Art. 482** — Lista as hipóteses que podem justificar demissão por
justa causa, incluindo falsidade documental. Não torna a justa causa
automática diante de suspeita — normalmente exige prova consistente e
proporcionalidade. Ver post "Quando a demissão por justa causa por atestado
falso pode (e não pode) acontecer".

**16º dia / responsabilidade do INSS** — A partir do 16º dia consecutivo de
afastamento por doença, a responsabilidade de remuneração migra da empresa
para o INSS, mediante perícia própria. Os primeiros 15 dias continuam sob
responsabilidade e verificação da empresa. Ver post "O afastamento que vira
dor de cabeça".

## Termos do produto

**Score de risco** — Número de 0 a 100 calculado deterministicamente (sem
IA) a partir de todos os sinais de verificação. Ver
`../produto/como-funciona.md` para a lógica completa.

**Confiabilidade** (Very Low / Low / Medium / High / Very High) — A
tradução do score de risco em uma faixa qualitativa, exibida ao cliente.

**Auto-validação** — Quando o score e os sinais são bons o suficiente para o
caso cair na fila de revisão rápida em vez da fila normal. Nunca significa
"ninguém olhou o caso" — todo caso ainda passa por um analista.

**Revisão de supervisor** — Escalação para um caso com indícios relevantes
de inconsistência — o nível mais alto de escrutínio interno antes de uma
decisão.

**Contato com a clínica** — Quando os sinais automáticos não são
suficientes e um analista precisa confirmar diretamente com a instituição
emissora.

**Parecer final** — O documento de conclusão de uma solicitação, com
resultado (confirmado / confirmado com ressalvas / inconclusivo /
inconsistente / não confirmado / não reconhecido pela instituição emissora),
resumo executivo, e limitações da análise. Pode ser impresso/salvo como PDF
pelo botão "Imprimir parecer".

**Timeline** — O histórico auditável de tudo que aconteceu numa solicitação,
com cada evento marcado como visível ou não ao cliente.

**Contestação (Dispute)** — Quando o cliente discorda de uma conclusão e
formalmente contesta, abrindo uma revisão.

## Termos de LGPD

**Dado sensível** — Categoria especial de dado pessoal com tratamento
reforçado exigido pela LGPD (Art. 5º, II e Art. 11) — inclui dado de saúde,
o que torna todo atestado médico um documento sensível por definição.

**Base legal / finalidade** — Toda solicitação exige a declaração de qual
base legal da LGPD justifica o tratamento daquele dado, e para qual
finalidade — obrigatório desde a criação da solicitação, não um adendo.

**Retenção** — Prazo configurável por organização depois do qual os dados
são automaticamente anonimizados/excluídos (job real, roda todo dia às 6h).

**Portal do titular** — Onde o próprio colaborador (não o RH) pode pedir
acesso, correção, anonimização, exclusão ou exportação dos próprios dados.

## Termos de infraestrutura/negócio

**Asaas** — Plataforma de cobrança recorrente usada para a mensalidade-base
e o faturamento mensal de uso. Ver `../vendas/precificacao.md`.

**Inngest** — Sistema de fila usado para rodar o pipeline de validação fora
do ciclo de requisição/resposta do upload.

**Webhook** — Forma de o sistema do cliente ser notificado automaticamente
de eventos (`request.received`, `request.completed`, etc.) sem precisar
ficar consultando a API.

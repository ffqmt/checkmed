# Níveis de cliente e abordagem

Alinhado aos planos já definidos (ver `precificacao.md`) — mas o nível de
cliente é sobre *como vender e atender*, não só sobre qual preço cobrar.

## Starter — até ~150 atestados/mês

**Perfil típico:** empresa de médio porte, RH pequeno, sem processo formal
de verificação hoje (aceita o atestado como está). A dor é mais "não temos
processo nenhum" do que "nosso processo atual falha".

**Gatilho emocional real:** alívio e vergonha, nessa ordem. A pessoa do RH
sabe, no fundo, que hoje decide no instinto — e sente um misto de alívio
("finalmente alguém entende esse problema") e um pouco de constrangimento
("a gente devia ter resolvido isso antes"). A venda funciona melhor quando
tira o peso da vergonha, não quando aumenta ele — nunca comunicar como "seu
processo atual é ruim", sempre como "isso não é sobre o que vocês fizeram
errado, é sobre uma ferramenta que não existia até agora".

**Abordagem:** foco em simplicidade e rapidez de implementação — "sobe o
atestado, o resto é automático" é o argumento central. Evitar sobrecarregar
com detalhe técnico de como cada verificação funciona; o auto-preenchimento
e a decisão automática já contam a história sozinhos.

**Posts pra usar com esse perfil:** "A pergunta que todo RH evita fazer
sobre atestados" (abertura, gera identificação sem acusar), "Por que seu RH
não deveria ser o detetive de atestados" (reforça o alívio), "A conta que
ninguém faz" (justifica o investimento em termos de tempo, não só risco).

**Risco de churn:** alto se o cliente sentir fricção na implementação —
priorizar onboarding rápido, sem exigir integração com sistema nenhum (o
upload direto pela web já resolve).

## Growth — até ~800 atestados/mês

**Perfil típico:** RH mais estruturado, possivelmente com algum processo
manual de verificação hoje (ex.: alguém liga pra clínica ocasionalmente).
Já sente o custo de tempo do processo manual.

**Gatilho emocional real:** cansaço e validação. Essa pessoa já tentou
resolver o problema na mão e sabe exatamente quanto isso consome — o
gatilho aqui não é "olha o risco que você não via", é "olha, alguém
finalmente automatizou o que você já vinha fazendo manualmente". Validar o
esforço que já existe é mais eficaz que apontar uma falha.

**Abordagem:** aqui vale mostrar o diferencial de rigor — cadastro próprio
de médicos, verificação de CNES, análise técnica do arquivo. Central de
Mensagens e notificação automática por WhatsApp (recursos deste nível)
resolvem uma dor real de comunicação com clínicas.

**Posts pra usar com esse perfil:** "5 mitos sobre atestado médico que o RH
ainda acredita" (reposiciona crenças sem parecer correção), "O que fazer
quando a clínica no atestado 'não existe'" (fala diretamente da dor do
contato manual), "Checklist: 8 coisas pra olhar antes de questionar um
atestado" (mostra rigor de forma concreta e compartilhável).

**Oportunidade:** cliente nesse porte costuma ter mais de um tomador de
decisão (RH + jurídico) — vale envolver os dois desde a primeira
demonstração, não só depois.

## Business — acima de 800 atestados/mês

**Perfil típico:** empresa grande, múltiplas unidades/filiais, jurídico
provavelmente envolvido na decisão de compra. Volume alto o suficiente para
que qualquer falha de processo tenha custo real e recorrente.

**Gatilho emocional real:** medo de exposição, não de custo. Nesse porte, o
que assusta não é o preço da ferramenta — é a exposição de um processo
frágil numa auditoria, numa ação trabalhista, numa reportagem. A conversa
que funciona é sobre governança e defensabilidade ("se alguém perguntar por
que essa decisão foi tomada, você tem resposta?"), não sobre eficiência
operacional.

**Abordagem:** SLA, API/webhooks para integração com o sistema de RH/folha
já existente, e conversa mais próxima de "parceria operacional" do que
"ferramenta". Vale trazer a conversa de regras de decisão configuráveis
(`/admin/decision-policy`) — clientes grandes costumam ter política de RH
própria que querem refletida no rigor do sistema.

**Posts pra usar com esse perfil:** "Quando a demissão por justa causa por
atestado falso pode (e não pode) acontecer" (fala diretamente ao medo do
jurídico), "'Parece falso' não é motivo suficiente" (mostra que rigor sem
processo é tão arriscado quanto ausência de rigor), "A confiança que se
constrói (ou se perde) num processo de RH" (linguagem de governança/cultura,
ressoa com decisores seniores).

**Processo de venda:** mais longo, múltiplos stakeholders, provavelmente
exige um piloto formal antes de qualquer assinatura de contrato.

## Enterprise — negociado

Fora da tabela padrão — porte, integrações e SLA específicos negociados
caso a caso. Normalmente entra por indicação ou expansão de um cliente
Business existente, não por prospecção fria.

## O que muda entre os níveis, na prática

| | Starter | Growth | Business/Enterprise |
|---|---|---|---|
| Ciclo de venda | Curto, 1 decisor | Médio, 2 decisores | Longo, múltiplos decisores |
| Argumento central | Simplicidade | Rigor + comunicação | Integração + governança |
| Recurso-chave na demo | Auto-preenchimento | Central de Mensagens | API/webhooks, regras configuráveis |
| Formato de fechamento | Autoatendimento/piloto rápido | Piloto com acompanhamento | Contrato negociado |

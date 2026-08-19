# Níveis de cliente e abordagem

Alinhado aos planos já definidos (ver `precificacao.md`) — mas o nível de
cliente é sobre *como vender e atender*, não só sobre qual preço cobrar.

## Starter — até ~150 atestados/mês

**Perfil típico:** empresa de médio porte, RH pequeno, sem processo formal
de verificação hoje (aceita o atestado como está). A dor é mais "não temos
processo nenhum" do que "nosso processo atual falha".

**Abordagem:** foco em simplicidade e rapidez de implementação — "sobe o
atestado, o resto é automático" é o argumento central. Evitar sobrecarregar
com detalhe técnico de como cada verificação funciona; o auto-preenchimento
e a decisão automática já contam a história sozinhos.

**Risco de churn:** alto se o cliente sentir fricção na implementação —
priorizar onboarding rápido, sem exigir integração com sistema nenhum (o
upload direto pela web já resolve).

## Growth — até ~800 atestados/mês

**Perfil típico:** RH mais estruturado, possivelmente com algum processo
manual de verificação hoje (ex.: alguém liga pra clínica ocasionalmente).
Já sente o custo de tempo do processo manual.

**Abordagem:** aqui vale mostrar o diferencial de rigor — cadastro próprio
de médicos, verificação de CNES, análise técnica do arquivo. Central de
Mensagens e notificação automática por WhatsApp (recursos deste nível)
resolvem uma dor real de comunicação com clínicas.

**Oportunidade:** cliente nesse porte costuma ter mais de um tomador de
decisão (RH + jurídico) — vale envolver os dois desde a primeira
demonstração, não só depois.

## Business — acima de 800 atestados/mês

**Perfil típico:** empresa grande, múltiplas unidades/filiais, jurídico
provavelmente envolvido na decisão de compra. Volume alto o suficiente para
que qualquer falha de processo tenha custo real e recorrente.

**Abordagem:** SLA, API/webhooks para integração com o sistema de RH/folha
já existente, e conversa mais próxima de "parceria operacional" do que
"ferramenta". Vale trazer a conversa de regras de decisão configuráveis
(`/admin/decision-policy`) — clientes grandes costumam ter política de RH
própria que querem refletida no rigor do sistema.

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

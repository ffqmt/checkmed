# [Caso simulado] "Inconclusivo" não é a mesma coisa que "suspeito"

**Data:** cenário simulado, ambientado em julho de 2026 — nenhum dado real de
cliente ou colaborador.
**Contexto:** atestado emitido por um médico de um estado cujo cadastro
próprio (`VerifiedDoctor`) ainda tinha cobertura parcial no momento do caso.

## O que os sinais automáticos mostraram

CRM: **inconclusivo** — formato plausível (número + UF corretos), mas sem
confirmação no cadastro próprio. Clínica: **confirmado** — CNPJ ativo,
nome batendo. QR code: não presente. Score final: 58 — na faixa de revisão
humana, sem alerta crítico.

## O que o analista fez diferente

Um analista menos experiente poderia ler "CRM inconclusivo" como sinal de
atenção equivalente a "CRM divergente" e escalar o caso, ou pedir contato
com a clínica com tom de desconfiança. Neste caso, o analista primeiro
checou se o estado do médico já tinha sido importado no cadastro próprio
(`scripts/import-verified-doctors.ts`, cobertura por UF documentada em
`../../produto/como-funciona.md`) — e confirmou que não. Ou seja: o sistema
não tinha como saber, não que o médico estivesse irregular.

Com essa informação, o contato com a clínica (quando feito) usa um tom
completamente diferente — não é "confirme se isso é verdade", é
"confirmação de rotina" (ver [roteiros-de-contato.md](../roteiros-de-contato.md)). A clínica
confirmou o atendimento sem estranhamento, e o parecer final registrou
honestamente a limitação: "CRM não localizado no cadastro verificado —
cobertura desse estado em construção; atendimento confirmado diretamente
com a instituição emissora."

## Lição

"Inconclusivo" é informação sobre o **nosso** cadastro, não necessariamente
sobre o documento. Tratar os dois como equivalentes gera dois problemas: um
analista mais cauteloso demais escala casos que não precisavam, gerando
atrito desnecessário com clínicas legítimas; um analista descuidado demais
pode, no sentido oposto, deixar de investigar um caso onde "inconclusivo"
de fato escondia uma divergência real. Antes de decidir o que fazer com um
resultado inconclusivo, a primeira pergunta é sempre "isso é lacuna de
cobertura ou é sinal real?" — ver
[checklist-avaliacao.md](../checklist-avaliacao.md) para a referência rápida por sinal.

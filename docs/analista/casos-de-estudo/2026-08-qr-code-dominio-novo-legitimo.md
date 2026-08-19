# [Caso simulado] Domínio "suspeito" que era só uma clínica nova

**Data:** cenário simulado, ambientado em agosto de 2026 — nenhum dado real
de cliente ou colaborador.
**Contexto:** atestado com QR code de autenticação apontando para o site
próprio de uma clínica de porte médio, fora da lista de domínios
conhecidos do sistema.

## O que os sinais automáticos mostraram

QR code decodificado com sucesso, dado batendo exatamente com o que o
documento declarava (nome, data, CRM). O único ponto de atenção: o domínio
do link não constava na lista de emissores conhecidos e confiáveis,
resultando em "domínio suspeito" — sinal de atenção moderada, não crítica.
CRM e CNPJ ambos confirmados. Score: 74 — faixa de revisão humana padrão.

## O que o analista fez diferente

"Domínio suspeito" é, no nome, o rótulo mais alarmante entre os resultados
possíveis de QR code — mas o checklist é explícito: "domínios legítimos
novos podem não estar na lista ainda" (ver
[checklist-avaliacao.md](../checklist-avaliacao.md)). O analista verificou o domínio
manualmente (WHOIS simples, site da própria clínica, CNPJ já confirmado
batendo com o nome do site) e confirmou que era, de fato, o site oficial de
uma clínica recém-inaugurada — sem nenhuma relação com fraude, só uma
lacuna da lista de domínios conhecidos.

O caso seguiu para confirmação com resultado positivo, e — mais importante
para os próximos casos — o domínio foi reportado internamente para entrar
na lista de emissores conhecidos, reduzindo o atrito para casos futuros da
mesma clínica.

## Lição

O nome de um resultado ("suspeito") carrega mais peso emocional do que
deveria carregar tecnicamente. O checklist existe exatamente para separar
"o rótulo alarma" de "o sinal realmente indica risco" — e é por isso que
esse tipo de leitura cuidadosa (não só copiar a recomendação automática,
ver "Erros comuns a evitar" em [manual-do-analista.md](../manual-do-analista.md)) é o que
diferencia um analista experiente de uma aprovação automática sem
critério. Um sistema que trata toda novidade como suspeita eventualmente
pune justamente os clientes legítimos que estão crescendo mais rápido.

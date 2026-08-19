# Casos de estudo

Esta pasta ainda não tem nenhum caso **real** documentado. Os três casos
aqui hoje são simulados — cada um com **"[Caso simulado]"** já no título,
justamente para nunca serem confundidos com um caso real. Servem pra
estudar o método de leitura de sinais antes do primeiro caso de verdade
acontecer; quando ele acontecer, documente-o do lado dos simulados, sempre
com os dados sensíveis removidos/mascarados. Não crie um caso fictício
*sem* marcar como tal — a regra abaixo continua valendo.

## Quando vale documentar um caso

- Um caso onde a decisão automática e a decisão do analista divergiram, e o
  porquê é uma lição reaproveitável.
- Um caso que expôs uma lacuna real (cobertura de estado, provedor externo
  indisponível, sinal ambíguo) que vale conhecer antes de revisar um caso
  parecido.
- Um caso de contestação (`Dispute`) que ensinou algo sobre como comunicar
  uma conclusão pro cliente.

## Template

Copie a estrutura abaixo para um novo arquivo `AAAA-MM-slug-descritivo.md`
nesta pasta:

```markdown
# [Título curto e descritivo do caso]

**Data:** [quando aconteceu]
**Contexto:** [1-2 frases sobre o tipo de caso, sem dados identificáveis do colaborador/empresa]

## O que os sinais automáticos mostraram

[score, indicadores, recomendação]

## O que o analista fez diferente (se aplicável)

[decisão tomada e por quê]

## Lição

[o que isso ensina para casos futuros parecidos]
```

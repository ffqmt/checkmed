# Checklist de avaliação por sinal

Referência rápida — o que cada resultado de verificação realmente significa
e o que fazer com ele. Para o contexto completo de como cada verificação
funciona, ver [como-funciona.md](../produto/como-funciona.md).

## Médico (CRM)

| Resultado | O que significa | O que fazer |
|---|---|---|
| Confirmado | Nome e CRM batem com o cadastro verificado manualmente contra o CFM | Sinal forte a favor; siga a análise normalmente |
| Divergente | CRM encontrado, mas nome não bate ou situação não é "regular" | Sinal de atenção real — vale investigar antes de prosseguir |
| Não localizado | Formato de CRM/UF implausível | Sinal de atenção real |
| Inconclusivo | Formato plausível, mas sem confirmação no cadastro | **Pode ser lacuna de cobertura, não problema no documento** — cheque se o estado já foi importado antes de tratar como risco |

## Clínica/instituição

| Resultado | O que significa | O que fazer |
|---|---|---|
| Confirmado | CNPJ ativo na Receita Federal, nome bate | Sinal forte a favor |
| Divergente | CNPJ inativo ou nome não bate | Sinal de atenção real |
| Não localizado | CNPJ não encontrado ou formato inválido | Sinal de atenção real |
| CNES confirmado (enriquecimento) | Estabelecimento também localizado no cadastro do Ministério da Saúde | Reforço adicional — nunca o único critério |

## QR Code / link de autenticação

| Resultado | O que significa | O que fazer |
|---|---|---|
| Válido | Decodificado, bate com o documento, domínio confiável, URL responde | Sinal forte a favor |
| Divergência de dados | O que foi decodificado não bate com o que o documento declarava | Sinal de atenção real — investigar |
| Domínio suspeito | Link aponta para fora da lista de emissores confiáveis conhecidos | Sinal de atenção — não é definitivo, domínios legítimos novos podem não estar na lista ainda |
| Inválido/inacessível | QR não decodificou ou URL não responde | Sinal de atenção moderado |
| Não presente | Documento não tinha QR/link | Neutro — nem todo atestado legítimo tem QR |

## Análise técnica (forense)

| Sinal | O que significa | O que fazer |
|---|---|---|
| Score de manipulação alto | Metadados/camadas/tipografia fora do padrão esperado | Investigar — não é acusação, é indício técnico |
| Score de geração por IA alto (quando Sightengine configurado) | Provedor externo estima alta probabilidade de conteúdo gerado por IA | Resultado probabilístico — força revisão humana obrigatória, nunca conclusão automática |
| Nenhum indício relevante | Arquivo dentro do padrão esperado | Neutro/positivo |

## Similaridade com casos anteriores

| Resultado | O que significa | O que fazer |
|---|---|---|
| Idêntico a caso não confirmado | Mesmo arquivo (ou muito parecido) de um caso que não foi validado antes | Sinal forte de atenção |
| Parecido, sem histórico de problema | Template/formato comum entre documentos legítimos da mesma clínica | Neutro — não tratar como risco só por semelhança |

## Regra geral

Nenhum sinal isolado decide um caso sozinho — o score existe justamente para
combinar todos eles. Quando dois ou mais sinais de atenção real apontam na
mesma direção, é hora de contato direto com a clínica ou escalação para
supervisor, conforme a recomendação automática já indica.

# [Caso simulado] Quando a similaridade pega o que os outros sinais não pegam

**Data:** cenário simulado, ambientado em julho de 2026 — nenhum dado real de
cliente ou colaborador.
**Contexto:** dois atestados de colaboradores diferentes, submetidos com
poucos dias de diferença, dentro da mesma organização cliente.

## O que os sinais automáticos mostraram

Isoladamente, cada atestado parecia bem resolvido: CRM confirmado, CNPJ da
clínica confirmado, sem alerta de análise técnica. O que mudou tudo foi o
sinal de **similaridade** — o segundo documento tinha um hash perceptual de
imagem quase idêntico ao primeiro, incluindo um artefato de compressão
específico no canto do carimbo, algo que dificilmente se repete por acaso
entre dois atendimentos reais e independentes. O score final caiu para 22 —
faixa de revisão de supervisor.

## O que o analista fez diferente

O analista não tratou a similaridade como prova — tratou como o motivo
para olhar os dois documentos lado a lado com atenção redobrada, exatamente
como orienta a aba Documento (ver
[manual-do-analista.md](../manual-do-analista.md)). Ao comparar visualmente, ficou visível
que a data e o nome do paciente tinham sido alterados sobre a mesma base de
imagem — o tipo de indício que nenhum sinal isolado (CRM, CNPJ) captura
sozinho, porque ambos os dados verificados podiam estar tecnicamente
corretos mesmo assim.

O caso foi escalado para revisão de supervisor, como o score já indicava.
O parecer final não usou a palavra "fraude" — registrou, com precisão,
"indício de inconsistência: reaproveitamento de base documental identificado
por análise de similaridade", deixando a decisão sobre o desfecho (incluindo
qualquer medida trabalhista) para a empresa cliente, com a informação
técnica completa em mãos.

## Lição

Nenhum sinal isolado é feito pra pegar tudo — é exatamente por isso que o
score combina vários (ver "Regra geral" em
[checklist-avaliacao.md](../checklist-avaliacao.md)). A similaridade existe especificamente
para o tipo de caso onde CRM e CNPJ, sozinhos, não veem nada de errado —
porque de fato não há nada de errado *neles*. O papel do analista aqui não
foi desconfiar mais, foi saber que um alerta de similaridade pede um tipo
de verificação diferente (comparação visual direta) do que um alerta de
CRM ou CNPJ pede.

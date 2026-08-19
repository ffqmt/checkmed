# Manual do analista

Este é o material de estudo para quem vai operar o MedCheck no dia a dia —
revisar casos na fila, confirmar ou questionar os sinais automáticos, e
emitir o parecer final. Leia `../produto/como-funciona.md` antes deste
documento — aqui assume-se que você já sabe o que cada etapa do pipeline
faz.

## Onde você trabalha

A área operacional (`/ops`) tem três lugares principais:

- **Fila de análise** (`/ops/queue`) — todos os casos aguardando revisão,
  com filtro por status, confiabilidade e prioridade.
- **Central de Mensagens** (`/ops/messages`) — conversas de WhatsApp com
  clínicas/instituições, organizadas por contato, não por caso.
- **Detalhe de um caso** (`/ops/requests/[id]`) — onde a revisão de verdade
  acontece.

## Como revisar um caso

Abra o caso e, na aba "Visão geral", olhe primeiro o **score e a lista de
indicadores** — positivos e negativos, cada um com uma frase explicando o
porquê. Isso já responde "por que esse caso está nessa fila e não em
outra". Depois:

1. **Aba Médico** — o CRM foi confirmado, está divergente, ou inconclusivo?
   Lembre: "inconclusivo" pode significar tanto "médico irregular" quanto
   "esse estado ainda não foi importado no nosso cadastro" — o texto da
   observação distingue os dois casos; leia com atenção antes de tratar como
   sinal de risco.
2. **Aba Clínica** — CNPJ ativo e nome batendo? Se o CNES também confirmou o
   estabelecimento, isso aparece como reforço, nunca como único critério.
3. **Aba QR Code** — se o documento tinha QR/link, o que foi decodificado
   bate com o que o documento declarava? O domínio é confiável?
4. **Aba Análise técnica** — sinais do arquivo em si (metadados, camadas,
   geração por IA quando configurado). Um score alto aqui pede atenção
   redobrada, não é definitivo sozinho.
5. **Aba Similaridade** — esse documento se parece com outro caso? Se sim,
   aquele outro caso foi confirmado ou não?
6. **Aba Documento** — sempre olhe o arquivo original antes de concluir.
   Nenhum sinal automático substitui olhar o documento de verdade.

## Como decidir

Depois de revisar os sinais, você tem três caminhos:

- **Concordar com a recomendação automática** e seguir para emissão do
  parecer.
- **Registrar um contato** (`Aba Contatos`) quando for necessário confirmar
  diretamente com a clínica/instituição — o resultado desse contato
  (confirmado, negado, sem resposta) também entra na timeline.
- **Divergir da recomendação automática** — você pode e deve fazer isso
  quando tiver informação que o sistema não tinha. O score é um apoio à
  decisão, não uma sentença.

## Como emitir o parecer

O parecer final precisa de:

- **Resultado** — uma das opções neutras (confirmado, confirmado com
  ressalvas, inconclusivo, inconsistente, não confirmado, não reconhecido
  pela instituição emissora). Nunca "atestado falso" ou "fraude" — ver
  `../produto/visao-geral.md`, seção "O que o produto nunca faz". Essa regra
  vale também para o texto livre que você escreve, não só para os campos
  estruturados.
- **Resumo executivo** — em linguagem direta, o que foi verificado e por
  que a conclusão é essa. Escreva pensando em alguém do RH que não
  acompanhou o caso lendo isso pela primeira vez.
- **Limitações** — seja explícito sobre o que não foi possível confirmar
  (ex.: "médico não consta no cadastro verificado — cobertura desse estado
  ainda em construção" é diferente de "não foi possível verificar por falha
  técnica").
- **Notas internas** (opcional) — nunca aparecem para o cliente; use para
  contexto que ajude o próximo analista ou o supervisor, não para
  observações que deveriam estar no resumo executivo.

Casos de score muito baixo ou com alerta crítico exigem aprovação de um
supervisor antes do parecer ser considerado final — isso é reforçado pelo
próprio sistema, não depende de lembrar.

Depois de emitido, o parecer pode ser impresso/salvo como PDF pelo cliente
(botão "Imprimir parecer" na tela dele) — não existe hoje um PDF gerado e
armazenado no servidor, é impressão do navegador.

## Erros comuns a evitar

- **Tratar "inconclusivo" como "suspeito".** Muitas vezes é só uma lacuna de
  cobertura (estado não importado, provedor externo não configurado), não
  um sinal de problema no documento.
- **Tratar atestado de UBS/UPA/posto de saúde como "fora de rede".** A Lei
  605/49 inclui qualquer unidade do SUS na lista de emissores válidos, sem
  ressalva — ver `../produto/glossario.md`.
- **Usar o CID como critério de decisão.** Na maioria dos casos ele nem
  deveria estar visível (Resolução CFM 1658/2002) — e mesmo quando está, não
  é o que valida ou invalida um atestado.
- **Copiar a recomendação automática sem ler os indicadores.** O score
  existe para acelerar, não para substituir a leitura do caso.

## Ver também

- `checklist-avaliacao.md` — checklist rápido por tipo de sinal
- `casos-de-estudo/` — casos reais documentados, à medida que acontecem

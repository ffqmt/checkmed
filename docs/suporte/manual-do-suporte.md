# Manual de suporte ao cliente

Isso é sobre o que acontece **depois** que a empresa já é cliente — dúvidas
de uso, contestações, e o que responder quando alguém do RH escreve
perguntando algo. Complementa
[manual-do-analista.md](../analista/manual-do-analista.md) (que é sobre revisar o caso em si) e
[roteiro-de-abordagem.md](../vendas/roteiro-de-abordagem.md) (que é sobre fechar o cliente, não sobre
atendê-lo depois).

## O que já é automático (você não precisa fazer nada)

- **Notificação de mudança de status** — WhatsApp e e-mail são disparados
  sozinhos quando uma solicitação muda de status (recebida, em
  processamento, aguardando confirmação externa, concluída, ou com indício
  de inconsistência). O cliente controla isso em `/app/settings`
  (inclusive pode desligar só o canal WhatsApp, mantendo as notificações
  dentro do app).
- **Timeline visível ao cliente** — toda solicitação tem uma linha do tempo
  onde cada evento é marcado como visível ou não ao cliente. Isso inclui,
  desde agora, a resolução de uma contestação (ver abaixo) — o cliente lê
  a mesma explicação que você escreveu, sem precisar de um segundo canal.
- **SLA** — cada organização tem um prazo (`slaHours`, configurável por
  organização) e o indicador visual (`SlaIndicator`) mostra se está dentro
  do prazo, perto de vencer, ou vencido — tanto pra você quanto pro
  cliente.

## Contestações — o fluxo completo

Uma contestação (`Dispute`) é aberta pelo próprio cliente, direto na
solicitação, com um dos quatro motivos reais disponíveis hoje:

1. Dados do colaborador informados incorretamente
2. Possui documentação adicional para análise
3. Discorda do resultado da validação
4. Outro motivo

Ao abrir, a solicitação muda para status **Em contestação** e a
contestação aparece automaticamente no topo do caso em
`/ops/requests/[id]` — um card amarelo, visível pra qualquer analista, com
o motivo, a descrição completa do cliente, quem abriu e quando.

**Quem pode resolver:** só quem tem permissão de aprovar revisão de
supervisor (Supervisor, Administrador Interno ou Super Administrador) —
mesma regra de quem aprova um parecer. Um analista comum vê a contestação,
mas não tem o formulário de resolução.

**Como resolver:**

1. Abra o caso em `/ops/requests/[id]` — o card da contestação aparece
   antes das abas, impossível de não ver.
2. Leia o motivo e a descrição do cliente com atenção — o motivo escolhido
   (ex.: "discordo do resultado") às vezes não descreve o problema real; a
   descrição em texto livre geralmente conta mais.
3. Escolha o novo status:
   - **Em análise** — você está olhando o caso, ainda sem conclusão.
   - **Aguardando informações** — você precisa de algo do cliente antes de
     continuar (reabre a solicitação, para o cliente poder responder).
   - **Resolvida** — a contestação procedeu, a solicitação é reaberta com o
     novo entendimento.
   - **Indeferida** — a contestação não procedeu, o resultado original se
     mantém.
   - **Cancelada** — o próprio cliente pediu pra desconsiderar, ou o motivo
     deixou de existir.
4. Escreva a resolução — **o texto que você escrever aqui é exatamente o
   que o cliente vai ler** na linha do tempo dele. Escreva pensando nisso:
   direto, sem jargão interno, sem "notas para o próximo analista" (isso é
   o campo de notas internas do parecer, não este).
5. Salvar. A solicitação muda de status automaticamente (Resolvida/
   Aguardando informações → reaberta; Indeferida/Cancelada → volta a
   Contestada) e o cliente é notificado pela timeline.

## Como responder no tom certo

Mesma regra do resto do produto — nunca "vocês estão errados" nem
"atestado falso", e nunca "isso não é problema nosso" mesmo quando
tecnicamente não é. Duas fórmulas que funcionam:

- **Quando a contestação procede:** "Revisamos com a informação adicional
  que vocês trouxeram e atualizamos a conclusão para [resultado] — obrigado
  por reportar, isso ajuda a manter o processo confiável."
- **Quando não procede:** "Revisamos novamente considerando o que foi
  reportado, e o resultado original se mantém porque [motivo específico,
  não genérico]. Qualquer nova informação, é só reabrir."

## Ver também

- [perguntas-frequentes.md](perguntas-frequentes.md) — respostas prontas pras dúvidas mais comuns
- [../analista/manual-do-analista.md](../analista/manual-do-analista.md) — como o caso foi decidido antes de virar contestação
- [../produto/glossario.md](../produto/glossario.md) — "Contestação (Dispute)" e outros termos usados aqui

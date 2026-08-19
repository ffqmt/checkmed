# Roteiros de contato com clínica/instituição

Complementa [manual-do-analista.md](manual-do-analista.md) — aqui é especificamente sobre a
ligação/WhatsApp com a clínica ou instituição emissora, quando os sinais
automáticos não bastam para decidir. É a etapa mais delicada do processo:
você está pedindo confirmação sobre o atendimento de uma pessoa real, para
uma instituição que não tem nenhuma obrigação de te responder.

## Antes de ligar

- **Nunca abra pedindo para "confirmar se o atestado é verdadeiro".** Isso
  soa a acusação e faz a instituição fechar a porta. O enquadramento certo é
  sempre "confirmação de rotina do nosso processo interno de RH" — é
  literalmente o que está acontecendo, e é a versão que não coloca ninguém
  na defensiva.
- **Separe o que você precisa confirmar do que você não precisa perguntar.**
  Você precisa saber se aquele médico atendeu aquele paciente naquela data.
  Você **não** precisa (e não deve) perguntar qual foi o diagnóstico — o CID
  é dado sensível e não é relevante para a pergunta que você está fazendo
  (ver [glossario.md](../produto/glossario.md), "CID").
- **Tenha em mãos, antes de discar:** nome do paciente, data do atendimento,
  nome do médico e CRM (se houver), nome da clínica. Pedir essas informações
  *para* a clínica no meio da ligação passa a impressão de que você não tem
  o documento em mãos.

## Roteiro por telefone

**Abertura:**

> "Bom dia/boa tarde, meu nome é [seu nome], sou da [MedCheck / nome da
> empresa cliente, conforme o combinado com a organização]. Estou fazendo
> uma confirmação de rotina sobre um atendimento — vocês têm um minuto?"

Se pedirem contexto antes de continuar:

> "Recebemos um atestado médico de um colaborador e, como parte do nosso
> processo interno, confirmamos diretamente com a instituição emissora
> antes de dar seguimento. É rápido — só preciso confirmar três coisas."

**As perguntas certas, nesta ordem:**

1. "Vocês confirmam que o Dr(a). [nome] atende nessa unidade?" — pergunta
   mais fácil de responder, estabelece cooperação antes da pergunta
   principal.
2. "Foi emitido um atestado para o paciente [nome] com data de [data]? Só
   preciso da confirmação de que o atendimento aconteceu nessa data — não
   preciso do motivo da consulta."
   - Dizer explicitamente "não preciso do motivo" antes de perguntarem é o
     que evita a resposta automática de recusa por sigilo médico — mostra
     que você já sabe o limite e não vai ultrapassá-lo.
3. Só se a resposta anterior for confirmada: "E o CRM registrado para o
   Dr(a). [nome] é o [número]/[UF]?" — última confirmação, a mais específica.

**Se pedirem autorização do paciente antes de responder** (resposta comum e
legítima, principalmente em clínicas particulares maiores): não insista.
Registre como `REQUESTED_PATIENT_AUTHORIZATION` e escale para o RH do
cliente decidir se vale pedir a autorização ao colaborador — isso não é uma
falha sua, é o processo funcionando como deveria.

## Roteiro por WhatsApp

Use quando o telefone não atende, ou quando a instituição já opera
atendimento por WhatsApp (comum em clínicas pequenas/consultórios). Mais
curto que a ligação — sem a etapa de "vocês têm um minuto?", já que a pessoa
responde quando puder.

> Olá! Aqui é [seu nome], da [MedCheck / empresa cliente]. Estamos fazendo
> uma confirmação de rotina de atendimento para fins de RH — sem nenhuma
> urgência da parte de vocês, respondam quando puderem.
>
> Poderiam confirmar:
> 1) Se o Dr(a). [nome] atende nessa unidade
> 2) Se houve atendimento ao paciente [nome] em [data]
>
> Não precisamos do motivo da consulta, só a confirmação da data e do
> profissional. Obrigado(a)!

Manter o tom curto e as duas perguntas separadas por número — mensagem longa
e corrida tem taxa de resposta pior.

## O que fazer com cada resposta

| Resposta da instituição | Resultado a registrar | Próximo passo |
|---|---|---|
| Confirma médico, data e atendimento | `CONFIRMED_ISSUANCE` | Segue para emissão do parecer — sinal forte a favor |
| Nega que o médico atenda ali, ou nega o atendimento na data | `DENIED_ISSUANCE` | Sinal forte de atenção — geralmente encaminha para revisão de supervisor |
| Não encontram registro do paciente/atendimento, mas não negam categoricamente | `NOT_FOUND` | Trate como inconclusivo, não como negação — sistemas de agenda de clínica pequena falham; registre o motivo dado, se houver |
| Pedem autorização do colaborador antes de confirmar | `REQUESTED_PATIENT_AUTHORIZATION` | Escale para o RH do cliente decidir — não insista pela informação |
| Sem resposta após tentativa razoável (2 tentativas, canais diferentes, intervalo de ao menos algumas horas) | `NO_RESPONSE` | Documente as tentativas na timeline; o parecer final registra a limitação honestamente ("instituição não respondeu ao contato") |
| Telefone/WhatsApp inválido, não existe, número errado | `INVALID_CONTACT` | Sinal de atenção — se o único canal de contato da clínica já é inválido, isso pesa na análise da clínica em si |
| Pedem para ligar em outro horário | `CALL_BACK_LATER` | Reagende — não conta como `NO_RESPONSE` ainda |

## Erros comuns a evitar

- **Perguntar o motivo da consulta ou o diagnóstico.** Nunca é necessário
  para a pergunta que você está respondendo, e pedir isso é o que mais
  frequentemente faz uma clínica recusar cooperação por completo.
- **Usar a palavra "fraude", "falso" ou "suspeito" na ligação.** Mesma regra
  do parecer final ([manual-do-analista.md](manual-do-analista.md)) — vale também para a conversa
  falada, não só para o texto escrito.
- **Insistir depois de um "não posso confirmar sem autorização do
  paciente".** É uma resposta legítima, não uma evasiva — trate como tal.
- **Não anotar a ligação na hora.** Registre o contato (`Aba Contatos`)
  logo após desligar, com o resultado e qualquer detalhe relevante que a
  instituição tenha mencionado — depois de duas ou três ligações seguidas,
  os detalhes se confundem.

## Ver também

- [manual-do-analista.md](manual-do-analista.md) — o processo completo de revisão, do qual o
  contato é uma etapa
- [checklist-avaliacao.md](checklist-avaliacao.md) — quais sinais tipicamente levam a precisar desse
  contato

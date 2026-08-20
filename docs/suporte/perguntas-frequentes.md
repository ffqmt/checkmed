# Perguntas frequentes — respostas prontas

Respostas que você pode adaptar e responder direto pro cliente. Cada uma
aqui reflete o que o produto realmente faz — nunca prometa algo que não
está nesta lista sem confirmar antes com o time de produto.

## "Por que o resultado do atestado veio como 'inconclusivo'?"

"Inconclusivo" quase sempre significa que ainda não temos confirmação
própria sobre aquele médico ou clínica específica — não é sinal de
problema no documento. O cadastro de médicos verificados cresce estado por
estado, então cobertura parcial é esperada hoje, não uma falha. Se o caso
já passou por um analista, ele avaliou os outros sinais (clínica, QR code,
análise técnica) antes de decidir o encaminhamento.

## "Como eu contesto um resultado?"

Direto na solicitação (`/app/requests/[id]`), tem o botão "Contestar
resultado" — escolha o motivo mais próximo e descreva com detalhe. Um
supervisor revisa e a resposta aparece na linha do tempo da própria
solicitação, geralmente em poucos dias úteis. Ver
[manual-do-suporte.md](manual-do-suporte.md) pro fluxo completo do nosso lado.

## "Vocês guardam os dados do meu funcionário? Por quanto tempo?"

Sim, pelo prazo configurado pra sua organização (padrão 365 dias, ajustável
em `/admin/retention` pelo nosso time). Depois disso, um job automático
anonimiza ou exclui os dados — não depende de alguém lembrar de fazer
manualmente. O CID (diagnóstico) é mascarado por padrão em todas as telas,
inclusive internamente, porque é dado de saúde sensível.

## "Meu funcionário quer que os dados dele sejam apagados/corrigidos. Como fazemos?"

O próprio colaborador (não precisa ser via RH) pode abrir uma solicitação
de acesso, correção, anonimização, exclusão ou exportação dos dados dele —
é um portal próprio pra isso, separado do login da empresa. Se ele preferir
passar pelo RH, encaminhe o pedido pra gente que registramos formalmente.

## "Como funciona a cobrança?"

Duas partes: uma mensalidade-base fixa (conforme o plano) e um valor
variável por atestado processado no mês anterior, faturado separadamente
todo mês — nunca uma estimativa, sempre o número real. Ver
[../vendas/precificacao.md](../vendas/precificacao.md) pra estrutura completa dos planos.

## "Por que estou recebendo mensagem no WhatsApp? Dá pra desligar?"

Sim — em `/app/settings`, cada usuário controla, por tipo de evento, se
quer receber (solicitação recebida, em processamento, aguardando resposta
externa, concluída, com indício de inconsistência), e existe um interruptor
específico só pro canal WhatsApp, independente das notificações dentro do
app.

## "Consigo integrar isso com o nosso sistema de RH?"

Sim, via API própria com chave de acesso (`/admin/api-keys` do lado do
cliente) e webhooks pra receber eventos automaticamente
(`request.received`, `request.completed`, etc. — ver `/admin/webhooks`).
Indicado pra clientes de porte maior com volume ou integração já
estruturada — pra a maioria, o upload direto pela tela já resolve.

## "Posso adicionar mais gente da minha empresa pra usar o sistema?"

Sim — quem é Administrador da Empresa convida outros usuários em
`/app/users`, com dois perfis possíveis: Administrador (gerencia usuários e
configurações) ou Usuário (envia e acompanha solicitações).

## "Preciso de um PDF do parecer pra guardar/anexar em outro lugar."

O botão "Imprimir parecer", na própria tela do parecer, gera um PDF direto
do navegador (Ctrl+P / Cmd+P também funciona) — não existe hoje um arquivo
gerado e armazenado do nosso lado, é sempre gerado na hora, sob demanda.

## "O prazo (SLA) já venceu e a solicitação ainda não saiu do lugar. O que houve?"

Confirme o status atual do caso — se está em "Aguardando resposta
externa" ou "Aguardando contato com clínica", o atraso normalmente é da
instituição emissora, não nosso. Se estiver parado num status interno
(processamento, revisão) além do esperado, escale pro supervisor
responsável verificar o caso — pode ser um caso real precisando de atenção,
não só demora.

## Ver também

- [manual-do-suporte.md](manual-do-suporte.md) — o fluxo completo de contestação, do nosso lado
- [../produto/glossario.md](../produto/glossario.md) — todo termo técnico citado aqui, explicado uma vez

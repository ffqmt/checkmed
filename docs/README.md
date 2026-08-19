# Material institucional do MedCheck

Esta pasta é o acervo vivo do produto — o lugar onde qualquer pessoa nova
(analista, vendedor, sócio) consegue estudar a ferramenta antes de operar
ou vender, e onde toda decisão de produto/negócio relevante fica registrada
para quem chegar depois entender o *porquê*, não só o *o quê*.

Ela cresce junto com o produto. Sempre que uma decisão de produto, preço,
processo ou abordagem comercial for tomada, o lugar certo para registrar é
aqui — não só na conversa onde foi decidida.

Qualquer usuário interno (analista, supervisor, admin) lê tudo isso dentro
do próprio app, sem precisar acesso ao repositório: **`/ops/documentacao`**.

## Como está organizada

```
docs/
  produto/
    visao-geral.md          O que é o MedCheck, para quem, proposta de valor
    como-funciona.md        O pipeline completo, etapa por etapa, com o que é real e o que é limitação conhecida
    glossario.md            Todo termo técnico/jurídico usado no produto, explicado uma vez
  analista/
    manual-do-analista.md   Como operar a fila, revisar um caso e emitir um parecer
    checklist-avaliacao.md  O que avaliar em cada sinal, e o que cada resultado realmente significa
    roteiros-de-contato.md  Falas prontas por telefone/WhatsApp com clínica/instituição, e as perguntas certas
    casos-de-estudo/        Casos reais documentados à medida que acontecem — vazio até o primeiro caso real
  vendas/
    playbook-comercial.md    Abordagem por tipo de cliente, links para os materiais de apresentação
    roteiro-de-abordagem.md  Falas prontas por fase da reunião, e as perguntas que criam o gatilho de necessidade
    niveis-de-cliente.md     Segmentação de cliente, gatilho emocional real de cada perfil, e qual post do blog usar em cada etapa
    gatilhos-e-objecoes.md   Os três medos que realmente vendem, e como responder às objeções mais comuns sem ser defensivo
    precificacao.md          Onde a precificação vive hoje e como evolui
  decisoes/
    log-de-decisoes.md               Registro cronológico das decisões de produto/negócio, com o porquê
    comparativo-provedores-cobranca.md  Por que Asaas — comparado de verdade contra Vindi/Pagar.me/Iugu/Stripe
  acoes-externas-pendentes.md  Contas/chaves que só a Fernanda pode criar (Asaas, Inngest, Upstash, Sentry)
```

O blog (`/blog` no app, conteúdo em `src/app/blog/posts.tsx`) tem hoje 18
posts reais — 3 explicativos sobre regulamentação (CFM, Lei 605, LGPD) e 15
voltados a gerar identificação e responder objeção de compra, mapeados por
perfil de cliente em `vendas/niveis-de-cliente.md`.

## Regra simples para manter isso vivo

Antes de fechar qualquer decisão de produto, preço ou abordagem comercial
que vá durar mais que uma conversa: escreva 3-5 linhas em
`decisoes/log-de-decisoes.md` — o que foi decidido, por quê, e o que ficou
descartado no caminho. Isso sozinho já cobre 80% do valor desta pasta; o
resto (manuais, playbook) é atualizado quando o comportamento do produto ou
da abordagem comercial muda de verdade, não a cada detalhe.

## Onde a precificação vive

Hoje, os números de referência (planos, custo por atestado, margem) vivem
em duas calculadoras publicadas como Artifacts — não neste repositório,
porque são ferramentas interativas, não documentos estáticos:

- **Precificação MedCheck** — modelo interno de custo e margem (não mostrar ao cliente)
- **Planos MedCheck** — simulador de plano por volume, seguro para mostrar ao cliente

Ver `vendas/precificacao.md` para o estado atual e o link de cada uma.

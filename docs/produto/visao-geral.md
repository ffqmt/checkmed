# Visão geral do produto

## O que é o MedCheck

MedCheck é uma plataforma B2B de **governança, validação documental e
auditoria operacional para atestados médicos**. Uma empresa cliente (o RH,
tipicamente) envia o atestado que um colaborador apresentou; o sistema lê o
documento, verifica o médico e a clínica/instituição emissores contra fontes
reais, analisa o próprio arquivo em busca de indícios técnicos de
manipulação ou geração por IA, calcula um score de confiabilidade e decide o
próximo passo — aprovar, pedir revisão humana, contatar a instituição
emissora, ou escalar para um supervisor. Toda essa sequência fica registrada
numa timeline auditável, e termina num parecer final que a empresa pode usar
como respaldo documental.

## Para quem é

Empresas de médio/grande porte com volume relevante de atestados médicos
recebidos por mês — hoje o suficiente para que a verificação manual (ligar
pra clínica, procurar o médico no site do CFM à mão) seja inviável em
escala, mas não tão grande a ponto de já ter um departamento médico interno
dedicado a isso.

## O problema real que resolve

Hoje, a esmagadora maioria das empresas simplesmente aceita o atestado como
está — sem checar se o médico existe de fato, se está regular no conselho de
classe, se a clínica é real, se as datas fazem sentido. Isso deixa a empresa
exposta nos dois sentidos: aceitar um atestado que não deveria ter sido
aceito é risco (inclusive de precedente para casos futuros); rejeitar um
atestado que era legítimo é passivo trabalhista por desconto indevido. A
decisão, hoje, geralmente é tomada por uma pessoa do RH sem acesso a nenhuma
fonte oficial e sem histórico de casos parecidos para comparar.

O MedCheck não tira essa decisão da empresa — ele dá à pessoa que decide a
informação que faltava, de forma rápida e documentada.

## O que o produto NUNCA faz

Por desenho, o MedCheck nunca afirma que um atestado é falso ou fraudulento.
A linguagem em toda a plataforma — telas, notificações, parecer final — é
deliberadamente neutra e juridicamente segura: "confirmado pela instituição
emissora", "indício de inconsistência", "não reconhecido pela instituição
emissora", "confiabilidade baixa/média/alta". Isso não é um detalhe de
copywriting — é uma decisão de produto que protege tanto o cliente quanto o
paciente de uma acusação que o sistema não tem (e não deveria ter)
autoridade para fazer. Quem decide "isso é fraude" é sempre uma pessoa, com
todo o contexto que só um ser humano tem, nunca o sistema sozinho.

Da mesma forma, o sistema nunca fabrica uma confirmação que não tem. Se não
existe fonte real para confirmar um dado (o exemplo mais importante: não
existe API pública do CFM para checar CRM em tempo real), o produto diz
exatamente isso — "não foi possível confirmar", nunca finge ter confirmado.
Essa é a diferença central entre o MedCheck e uma ferramenta genérica de
"IA que analisa documentos": aqui, cada afirmação sobre autenticidade é
rastreável até uma fonte real ou marcada honestamente como não verificada.

## Diferenciais reais (não citar nenhum que não esteja de fato implementado)

- **Cadastro próprio de médicos verificados manualmente junto ao CFM** —
  cresce estado por estado, hoje já cobrindo mais de 100 mil registros. Não
  é uma API de terceiro; é um ativo próprio, construído à mão porque não
  existe alternativa pública.
- **Verificação de clínica/CNPJ em tempo real** contra a Receita Federal,
  mais o Cadastro Nacional de Estabelecimentos de Saúde (CNES) do Ministério
  da Saúde, importado em massa e atualizado periodicamente.
- **Leitura do documento por IA (Claude Vision)** com auto-preenchimento dos
  dados do colaborador, cache por arquivo (o mesmo documento nunca é lido
  duas vezes), e observações neutras sobre o conteúdo do documento (campo de
  assinatura em branco, formato de CID incoerente, etc.) sem nunca acusar.
- **Decisão auditável** — todo score vem com a lista de sinais que o
  formaram, nunca uma nota sem explicação.
- **LGPD nativo, não remendado depois** — CID mascarado por padrão,
  retenção de dados com prazo e job automático de anonimização, portal para
  o próprio colaborador pedir acesso/correção/exclusão dos dados dele.

## Onde aprofundar

- `como-funciona.md` — o pipeline completo, etapa por etapa
- `glossario.md` — todo termo técnico usado no produto
- `../analista/manual-do-analista.md` — como operar a ferramenta no dia a dia

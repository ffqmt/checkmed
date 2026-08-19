# Ações externas pendentes

Tudo nesta lista é coisa que **só a Fernanda pode fazer** — criar conta,
gerar chave, confirmar identidade. O código já está pronto e vai funcionar
assim que essas variáveis forem preenchidas em produção (Vercel → Settings →
Environment Variables). Nada aqui bloqueia o app funcionar hoje — cada
integração cai graciosamente para "desativado, avisando no log" sem essas
chaves, exatamente como WhatsApp e Sightengine já funcionavam antes.

## 1. Cobrança — Asaas

1. Criar conta em https://sandbox.asaas.com (sandbox, grátis, imediato) para
   testar antes de ir pra produção real em https://www.asaas.com.
2. Gerar uma API key em Configurações → Integrações → API.
3. Preencher `ASAAS_API_KEY` e `ASAAS_ENV` (`SANDBOX` ou `PRODUCTION`).
4. Registrar o webhook: `POST /webhooks` na API do Asaas (ou pelo painel),
   apontando pra `https://<seu-domínio>/api/webhooks/asaas`, com um token de
   autenticação à sua escolha — o mesmo valor vai em `ASAAS_WEBHOOK_TOKEN`.

Sem isso: `/admin/billing` continua mostrando os planos, mas o botão de
"ativar assinatura" retorna um erro claro em vez de fingir que cobrou
alguém.

## 2. Fila de processamento — Inngest

1. Criar conta grátis em https://www.inngest.com.
2. Criar um app apontando para `https://<seu-domínio>/api/inngest`.
3. Copiar `INNGEST_EVENT_KEY` e `INNGEST_SIGNING_KEY` do painel.

Sem isso: localmente continua funcionando via
`npx inngest-cli@latest dev` (sem conta nenhuma). Em produção, sem essas
chaves, os eventos não são entregues — os atestados enviados ficariam
presos em "RECEIVED" sem processar.

## 3. Rate limiting da API pública — Upstash

1. Criar conta grátis em https://upstash.com.
2. Criar um banco Redis (região mais próxima do deploy Vercel).
3. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.

Sem isso: a API pública (`/api/v1/*`) roda sem limite de requisições — não
quebra nada, só fica sem essa proteção.

## 4. Monitoramento de erro — Sentry

1. Criar conta grátis em https://sentry.io.
2. Criar um projeto Next.js.
3. Copiar o DSN em `SENTRY_DSN` (server) e `NEXT_PUBLIC_SENTRY_DSN` (client)
   — geralmente o mesmo valor nos dois.
4. Opcional (só pra upload de source maps no build):
   `SENTRY_ORG`/`SENTRY_PROJECT`/`SENTRY_AUTH_TOKEN`.

Sem isso: o SDK fica inerte, sem erro nenhum — só sem visibilidade de
produção.

## 5. Continuar a importação de médicos e clínicas

- **Médicos (CRM)**: `npm run import:doctors:watch` já roda automaticamente
  a cada arquivo novo em `data/cfm-raw/` — hoje cobre 10 de 27 UFs. Priorize
  os estados de onde os primeiros clientes reais recebem atestados.
- **Clínicas (CNES)**: `npm run import:clinics` lê
  `data/cnes-raw/cnes_estabelecimentos.json` (baixado de
  dadosabertos.saude.gov.br, ~640MB, cobre o Brasil inteiro de uma vez —
  diferente de médicos, não precisa ser feito estado por estado). Re-rodar
  periodicamente (o dataset é atualizado diariamente pelo Ministério da
  Saúde) mantém o cadastro atualizado.

## Nenhuma dessas é urgente pra rodar um piloto

O sistema funciona de ponta a ponta sem nenhuma delas configurada — elas
destravam cobrança real, fila em produção real, proteção de API, e
visibilidade de erro em produção, respectivamente. Pra um primeiro piloto
com um cliente de confiança, dá pra rodar sem todas de uma vez.

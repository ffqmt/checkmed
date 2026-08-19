# MedCheck

MedCheck é uma plataforma B2B de **governança, validação documental e auditoria
operacional** para atestados médicos. Empresas assinantes enviam atestados de
colaboradores; o sistema extrai os dados com OCR/IA, valida médico e clínica
emissores, verifica QR Code/link de autenticação, executa análise técnica do
arquivo, calcula um score de confiabilidade e decide automaticamente o próximo
passo — concluir, pedir revisão humana, contatar a instituição emissora ou
escalar para um supervisor. Tudo fica registrado em uma timeline auditável.

O produto **nunca afirma fraude**. A linguagem em toda a plataforma é
propositalmente neutra e juridicamente segura: "confirmado pela instituição
emissora", "indício de inconsistência", "não reconhecido pela instituição
emissora", "confiabilidade baixa/média/alta" — nunca "atestado falso" ou
"fraude confirmada".

## Sumário

- [Stack técnica](#stack-técnica)
- [Setup local](#setup-local)
- [Setup do Supabase](#setup-do-supabase)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Migrations e seed](#migrations-e-seed)
- [Como rodar](#como-rodar)
- [Credenciais de demonstração](#credenciais-de-demonstração)
- [Perfis de usuário (RBAC)](#perfis-de-usuário-rbac)
- [Fluxo automático do sistema](#fluxo-automático-do-sistema)
- [Arquitetura de serviços](#arquitetura-de-serviços)
- [Como plugar integrações reais](#como-plugar-integrações-reais)
- [API pública e webhooks](#api-pública-e-webhooks)
- [Checklist LGPD](#checklist-lgpd)
- [Próximos passos](#próximos-passos)

## Stack técnica

- **Next.js 16** (App Router) + **TypeScript estrito**
- **Tailwind CSS v4** + componentes no estilo **shadcn/ui** (escritos localmente em `src/components/ui`)
- **Prisma ORM** sobre **PostgreSQL (Supabase)**
- **Supabase Storage** para os arquivos dos atestados (com fallback local para dev sem Supabase — veja abaixo)
- **Auth.js (NextAuth v5)** com provider de credenciais + JWT, para RBAC/multi-tenant
- **Zod** para validação, **React Hook Form** nos formulários mais complexos
- **TanStack Table** nas tabelas de solicitações, **Recharts** nos gráficos do painel operacional
- **Lucide React** para ícones
- Camada de **services** desacoplada para OCR, extração estruturada, validação de médico/clínica, QR Code, forense documental, similaridade, score de risco, WhatsApp e notificações — extração (Claude Vision, com cache por hash do arquivo), validação de clínica/CNPJ (Receita Federal via BrasilAPI), QR Code (decodificação real da imagem), forense de metadados/camadas/tipografia, similaridade (fingerprint + busca) e WhatsApp (Meta Cloud API real quando configurado por organização) já usam lógica real por padrão; validação de médico/CRM é honesta mas limitada (cadastro verificado manualmente + formato, sem fonte pública do CFM); e-mail é real via Resend. Só o OCR/extração cai de volta pro mock quando `EXTRACTION_PROVIDER` não está setado, e o WhatsApp cai pro simulado quando uma organização ainda não configurou telefone/token

## Setup local

```bash
git clone <repo>
cd Check
npm install
cp .env.example .env
# preencha DATABASE_URL / DIRECT_URL / NEXT_PUBLIC_SUPABASE_* (veja seção seguinte)
npx prisma generate
npx prisma migrate dev --name init
npm run db:seed
npm run dev
```

Acesse `http://localhost:3000`.

> **Rodando sem Supabase configurado:** se `NEXT_PUBLIC_SUPABASE_URL` e
> `SUPABASE_SERVICE_ROLE_KEY` não estiverem definidos, o upload de arquivos
> usa automaticamente um adapter local (`.local-storage/` na raiz do
> projeto) — útil para rodar o app localmente antes de criar o projeto
> Supabase. O banco de dados (Postgres) continua sendo necessário desde o
> início; pode ser o Postgres do Supabase ou qualquer Postgres local/dev.

## Setup do Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → Database**, copie as connection strings:
   - **Connection pooling (porta 6543, com `pgbouncer=true`)** → `DATABASE_URL`
   - **Direct connection (porta 5432)** → `DIRECT_URL` (necessária para `prisma migrate`)
3. Em **Project Settings → API**, copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (mantenha em segredo — nunca exponha no client)
4. Em **Storage**, crie os buckets:
   - `medical-certificates`
   - `evidence-files`
   - `reports`

   Todos podem ser privados — o app sempre acessa via `service_role` e gera
   URLs assinadas de curta duração para exibição (`getSignedUrl`, ver
   `src/server/services/storage.service.ts`). Se preferir criar via SQL/CLI:

   ```sql
   insert into storage.buckets (id, name, public) values
     ('medical-certificates', 'medical-certificates', false),
     ('evidence-files', 'evidence-files', false),
     ('reports', 'reports', false);
   ```

5. Rode as migrations apontando para o Supabase:

   ```bash
   npx prisma migrate deploy
   ```

## Variáveis de ambiente

Veja `.env.example` para a lista completa. Resumo:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Conexões Postgres (pooled / direta) do Supabase |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Credenciais do projeto Supabase |
| `SUPABASE_STORAGE_BUCKET*` | Nomes dos buckets de storage |
| `AUTH_SECRET` | Segredo do Auth.js (`openssl rand -base64 32`) |
| `WHATSAPP_VERIFY_TOKEN` | Handshake do webhook do WhatsApp (Meta) — provider/telefone/token são configurados por organização em `/admin/whatsapp`, não por env var |
| `WEBHOOK_SECRET` | Segredo usado para assinar payloads de webhook e o fallback de storage local |
| `ANTHROPIC_API_KEY`, `EXTRACTION_PROVIDER=CLAUDE_VISION` | Extração real do atestado via Claude Vision |
| `CRON_SECRET` | Autentica as chamadas do Vercel Cron em `/api/cron/*` (retenção, cobrança) |
| `ASAAS_API_KEY`, `ASAAS_ENV` (`SANDBOX`\|`PRODUCTION`), `ASAAS_WEBHOOK_TOKEN` | Cobrança real (Asaas) — ver seção "Cobrança" abaixo |
| `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY` | Fila real do workflow de validação — sem elas, funciona só com o Inngest Dev Server local (`npx inngest-cli@latest dev`) |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Rate limiting real na API pública — sem elas, a API roda sem limite (aviso no log, não falha silenciosa) |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Monitoramento de erro em produção — sem elas, o SDK fica inerte (no-op documentado) |

## Migrations e seed

```bash
npx prisma migrate dev     # cria/atualiza o schema local
npx prisma generate        # gera o Prisma Client (também roda automaticamente no postinstall)
npm run db:seed            # popular com dados de demonstração
npx prisma studio          # navegar pelo banco visualmente
```

O seed (`prisma/seed.ts`) cria: organizações, usuários internos e de
clientes, 20 solicitações em estágios e níveis de risco variados, dados
extraídos, validações de médico/clínica, QR Code, análise técnica,
fingerprint, score de risco, contatos, mensagens de WhatsApp, pareceres
finais e uma contestação — o suficiente para navegar por toda a plataforma
sem precisar enviar um atestado manualmente primeiro.

## Como rodar

```bash
npm run dev      # ambiente de desenvolvimento (http://localhost:3000)
npm run build    # build de produção
npm run start    # servir o build de produção
npm run lint     # eslint
```

## Credenciais de demonstração

Todas as contas do seed usam a senha **`password123`**.

| Papel | E-mail |
|---|---|
| Super Admin | `superadmin@medcheck.com.br` |
| Administrador Interno | `admin.interno@medcheck.com.br` |
| Supervisor | `supervisor@medcheck.com.br` |
| Analista | `analista1@medcheck.com.br` / `analista2@medcheck.com.br` |
| Administrador da Empresa (Horizonte Log) | `patricia.lemos@horizontelog.com.br` |
| Usuário da Empresa (Horizonte Log) | `diego.amaral@horizontelog.com.br` |
| Administrador da Empresa (NovaTech) | `felipe.marques@novatech.com.br` |
| Usuário da Empresa (NovaTech) | `aline.bittencourt@novatech.com.br` |

## Perfis de usuário (RBAC)

- **SUPER_ADMIN** — acesso total: organizações, usuários, configurações globais, métricas, auditoria.
- **INTERNAL_ADMIN** — operação interna: atribuição de analistas, regras operacionais, relatórios internos.
- **INTERNAL_SUPERVISOR** — revisão de casos sensíveis, aprovação de parecer final, tratamento de contestações.
- **INTERNAL_ANALYST** — análise de solicitações, correção de dados extraídos, registro de contatos, emissão de parecer preliminar.
- **CLIENT_ADMIN** — gerencia usuários da própria empresa, envia atestados, configura notificações.
- **CLIENT_USER** — envia atestados e acompanha solicitações.

O isolamento multi-tenant é reforçado em toda query de dados de cliente por
`organizationId` (nunca client-side) e o middleware (`src/middleware.ts` +
`src/auth.config.ts`) redireciona cada papel para sua área (`/app`, `/ops`,
`/admin`), impedindo acesso cruzado.

## Fluxo automático do sistema

`CertificateValidationWorkflow` (`src/server/services/workflow.ts`) orquestra,
em sequência: upload → hash → OCR → extração estruturada → validação do
médico + da clínica (em paralelo) → QR Code/link de autenticação → análise
técnica do arquivo → fingerprint documental → busca de similaridade → score
de risco → **decisão automática**:

- **Confiança alta** → fila de revisão rápida (`WAITING_HUMAN_REVIEW`)
- **Confiança média** → fila de revisão humana (`WAITING_HUMAN_REVIEW`)
- **Confiança baixa / QR inválido / clínica divergente** → contato com a clínica (`WAITING_CLINIC_CONTACT`)
- **Divergência crítica / alerta crítico / score muito baixo** → revisão de supervisor (`SUPERVISOR_REVIEW`)
- **Dados insuficientes** → `INCONCLUSIVE`

A partir daí, o registro de um `ContactAttempt` (confirmação, negação,
ausência de resposta) ou a emissão/aprovação de um `FinalReport` avançam o
status até um resultado final (`VALIDATED`, `VALIDATED_WITH_REMARKS`,
`INCONCLUSIVE`, `INCONSISTENT`, `NOT_CONFIRMED`,
`NOT_RECOGNIZED_BY_INSTITUTION`). Cada etapa grava um `RequestTimelineEvent`
(marcado como visível ou não ao cliente) e, quando sensível, um `AuditLog`.

O workflow roda de forma assíncrona, disparado por um evento Inngest
(`certificate/uploaded`) — quem sobe o arquivo (painel do cliente ou
`POST .../files` na API pública) só enfileira o evento e retorna na hora; o
pipeline inteiro (OCR → decisão) roda em `src/inngest/functions.ts`,
separado do ciclo de requisição/resposta que recebeu o upload. Localmente
funciona com o Inngest Dev Server (`npx inngest-cli@latest dev`, apontado
pra `http://localhost:3000/api/inngest`), sem precisar de conta; em
produção precisa de `INNGEST_EVENT_KEY`/`INNGEST_SIGNING_KEY` de uma conta
real (gratuita pra começar).

## Arquitetura de serviços

```
src/server/services/
  ocr.service.ts                 OcrService (mock — só usado quando EXTRACTION_PROVIDER≠CLAUDE_VISION)
  extraction.service.ts          MedicalCertificateExtractionService (mock — idem)
  document-intelligence.service.ts  Extração real via Claude Vision (EXTRACTION_PROVIDER=CLAUDE_VISION), com cache por hash do arquivo
  doctor-registry.service.ts     DoctorRegistryService (real — cadastro verificado manualmente + formato; nunca fabrica confirmação)
  clinic-registry.service.ts     ClinicRegistryService (real — CNPJ via Receita Federal/BrasilAPI, enriquecido com CNES via cache importado — ver scripts/import-verified-clinics.ts)
  qrcode.service.ts              QrCodeVerificationService (real — decodificação de imagem + checagem de domínio/alcançabilidade)
  forensics.service.ts           DocumentForensicsService (real — metadados/camadas/tipografia; IA-generation via Sightengine quando configurado)
  similarity.service.ts          DocumentSimilarityService (real — fingerprint perceptual + busca de documentos parecidos)
  risk-scoring.service.ts        RiskScoringService (determinístico, sem IA; limiares de decisão configuráveis por organização via OrganizationDecisionPolicy)
  whatsapp.service.ts            WhatsAppService + adapters (Meta Cloud API real quando configurado por organização; Twilio/Generic seguem mockados)
  notification.service.ts        NotificationService (in-app real, e-mail real via Resend, WhatsApp real via whatsapp.service.ts)
  billing.service.ts             Assinatura (mensalidade-base) + faturamento mensal de uso via Asaas — ver seção "Cobrança"
  storage.service.ts             StorageAdapter (Supabase real + fallback local)
  webhook-dispatch.service.ts    Disparo assinado (HMAC) de eventos para webhooks de organizações
  workflow.ts                    CertificateValidationWorkflow (orquestrador, disparado via Inngest — ver src/inngest/)
```

Cada serviço com uma variante mock é uma classe que implementa uma
interface — trocar a implementação (mock → real) nunca exige tocar nos call
sites. A maioria já roda a implementação real por padrão hoje; os mocks que
restam (OCR/extração sem `EXTRACTION_PROVIDER`, WhatsApp sem integração
configurada, Twilio/Generic) são fallbacks explícitos, não o estado padrão
do produto.

## Como plugar integrações reais

**OCR real** — implemente `OcrService` (`extractText`) chamando Google
Vision, AWS Textract, Azure Document Intelligence ou um worker Tesseract;
troque o export `ocrService` em `ocr.service.ts`.

**Extração estruturada com IA real** — implemente
`MedicalCertificateExtractionService.extractStructuredData` chamando a API
da Anthropic/OpenAI com um schema JSON estrito sobre o texto do OCR.

**Validação de CRM** — já é honesta hoje (`doctor-registry.service.ts`),
mas limitada: nenhuma API pública do CFM existe para consulta automática, só
confirma um CRM contra o cadastro `VerifiedDoctor` (verificado manualmente
por um analista no site do CFM) ou reporta o formato como plausível/implausível
— nunca inventa uma confirmação. Para automatizar de verdade, contrate um
provedor comercial (Netrin, Infosimples) e plugue em
`DoctorRegistryService.verifyDoctor`.

**Consulta de clínicas/CNPJ** — já é real hoje (`clinic-registry.service.ts`
→ `adapters/brasilapi-clinic-registry.adapter.ts`), consultando o CNPJ na
Receita Federal via BrasilAPI (grátis, sem chave). CNES (cadastro de
estabelecimentos de saúde do DATASUS) continua sem integração — nenhuma API
pública de consulta única foi encontrada; é uma lacuna documentada, não uma
confirmação assumida.

**WhatsApp Business real** — preencha `WHATSAPP_PROVIDER`,
`WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID` e implemente o corpo de
`MetaWhatsAppAdapter`/`TwilioWhatsAppAdapter`
(`src/server/services/adapters/`) com as chamadas reais às APIs dos
provedores. As rotas `/api/integrations/whatsapp/send` e
`/api/integrations/whatsapp/webhook` (GET para verificação, POST para
mensagens/status recebidos) já estão prontas.

**Jobs assíncronos reais** — a arquitetura foi pensada para trocar a
chamada direta de `runCertificateValidationWorkflow` por um enqueue em
Inngest, Trigger.dev, BullMQ, QStash ou Supabase Edge Functions + Cron,
mantendo cada etapa do workflow como está.

### Análise forense/antifraude (`DocumentForensicsService`)

O que já roda de verdade (`src/server/services/forensics-analyzers.ts`), sem
custo de provedor externo:

- **Metadados** — assinatura de software de edição (Photoshop/Canva/GIMP/etc.)
  no Producer/Creator do PDF ou EXIF/XMP da imagem; gap suspeito entre data
  de criação e modificação; citação literal de ferramenta de geração por IA
  nos metadados (sinal honesto, mas fraco — nem toda ferramenta se declara).
- **Camadas do PDF** — conta revisões salvas (marcadores `%%EOF`); múltiplas
  revisões indicam edição após a geração inicial.
- **Tipografia** — famílias de fonte incorporadas no PDF; muitas famílias
  distintas em um documento simples pode indicar conteúdo combinado.

**Fase 2 — detecção estatística de IA/deepfake (`ai-detection.service.ts`)**:
ativa quando `AI_DETECTION_PROVIDER=SIGHTENGINE` e as chaves
`SIGHTENGINE_API_USER`/`SIGHTENGINE_API_SECRET` estão configuradas (crie uma
conta em [sightengine.com](https://sightengine.com), pegue as chaves no
dashboard). Sem isso configurado, o sistema cai automaticamente de volta no
sinal gratuito de metadados (só pega quando a própria ferramenta se declara
no arquivo). Quando configurado, cada imagem (upload direto ou a maior foto
incorporada em um PDF) é enviada para a Sightengine, que devolve um score de
probabilidade de geração por IA e de deepfake — a resposta bruta fica salva
em `TechnicalAnalysis.externalProviderResponseJson` para auditoria. Uma
chamada de vendor com falha (rede, cota, chave inválida) nunca derruba o
workflow — cai de volta no sinal de metadados e registra o motivo no
parecer técnico.

O que **ainda não** está ativo: verificação de compressão de imagem
localizada (`detectImageCompressionInconsistencies`,
`detectStampOrSignatureAnomalies`) — o sinal que pegaria um carimbo ou
assinatura colado de outra imagem *real* (diferente de "gerado do zero por
IA", que a Sightengine já cobre acima). Uma implementação própria (Error
Level Analysis, depois JPEG Ghost) foi prototipada e testada com documentos
limpos e adulterados de propósito — a primeira gerava falso-positivo em
qualquer documento com texto, a segunda deixou de detectar uma adulteração
deliberadamente plantada no teste. Em vez de expor um sinal não confiável
(risco real de acusar documento legítimo, o oposto do que este produto se
propõe a fazer), essas funções retornam 0 e ficam de fora do
`manipulationRiskScore` até uma destas duas coisas acontecer:

1. **Integrar um provedor especializado em forense documental** — ex.
   Resistant AI (cobre adulteração e conteúdo sintético na mesma chamada),
   ou uma suíte de IDV com módulo de forense documental (Onfido, Mitek,
   ComplyCube, Jumio).
2. **Retomar a implementação própria** com mais rigor — o código do JPEG
   Ghost fica em `forensics-analyzers.ts` (não chamado, documentado como
   ponto de partida) para quem quiser validar contra documentos adulterados
   reais (não sintéticos) antes de reativar.

## API pública e webhooks

Autenticação por API key (gerada em `/admin/api-keys`), enviada via header
`Authorization: Bearer <key>` (ou `X-API-Key`). Limitada a 60 requisições/minuto
por chave quando `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` estão
configurados — sem eles, roda sem limite (aviso no log do servidor, não uma
falha silenciosa).

```
POST   /api/v1/certificate-requests             cria uma solicitação (sem arquivo)
POST   /api/v1/certificate-requests/:id/files   anexa o atestado e dispara o workflow
GET    /api/v1/certificate-requests/:id         detalhe de uma solicitação
GET    /api/v1/certificate-requests             lista solicitações da organização
GET    /api/v1/certificate-requests/:id/report  parecer final (quando disponível)
POST   /api/v1/webhooks/test                    dispara um evento de teste
```

Eventos de webhook (payload assinado em `X-MedCheck-Signature`, HMAC-SHA256
com o secret do endpoint): `request.received`, `request.processing_started`,
`request.waiting_human_review`, `request.waiting_external_response`,
`request.completed`, `request.inconsistent`, `request.contested`.

## Cobrança

Cada organização pode ter um plano atribuído (`billingPlanTier` +
`billingBaseFeeCents`/`billingPerUnitCents`, atribuídos em `/admin/billing`)
e uma assinatura ativa no [Asaas](https://www.asaas.com) — a plataforma de
cobrança recorrente padrão do mercado brasileiro (boleto/PIX-first, onboarding
nativo por CNPJ), escolhida em vez do Stripe puro justamente por isso: todo
cliente do MedCheck é uma empresa brasileira.

A mensalidade-base e o valor variável por atestado são cobrados de formas
diferentes, porque a API do Asaas trata os dois casos de forma diferente:

- **Mensalidade-base** — uma assinatura Asaas de valor fixo
  (`createAsaasSubscription`), cobrada automaticamente todo mês pelo próprio
  Asaas.
- **Uso variável** — o Asaas não tem "assinatura de valor variável", então o
  cron mensal (`/api/cron/billing`, todo dia 1º) soma os `UsageRecord` reais
  do mês anterior (um por atestado efetivamente processado — ver
  `recordUsage` em `billing.service.ts`) e cria uma cobrança avulsa
  (`createAsaasCharge`) só com esse valor. Cada solicitação processada é
  auditável até a fatura — nunca uma estimativa.

Pagamentos e assinaturas são sincronizados de volta via webhook
(`/api/webhooks/asaas`, autenticado pelo header `asaas-access-token` que o
Asaas ecoa — configurado como `ASAAS_WEBHOOK_TOKEN`).

**Para ativar de verdade**, veja "Ações que só você pode tomar" — resumindo:
criar uma conta Asaas (sandbox pra testar, grátis), gerar uma API key, e
preencher `ASAAS_API_KEY`/`ASAAS_ENV`/`ASAAS_WEBHOOK_TOKEN`.

## Checklist LGPD

- [x] CPF sempre mascarado fora de contexto que exija o dado completo (`src/lib/masking.ts`)
- [x] CID nunca exibido no painel do cliente; tratado como "Restrito" mesmo internamente na maioria das telas
- [x] Base legal (`consentOrLegalBasis`) e finalidade (`treatmentPurpose`) obrigatórios na criação de toda solicitação
- [x] Data de retenção (`retentionUntil`) calculada por organização a partir de `dataRetentionDays`
- [x] `DataRetentionPolicy` configurável por organização (anonimização e exclusão automática de arquivos)
- [x] `DataPrivacyRequest` modelado para acesso, correção, anonimização, exclusão e exportação
- [x] URLs de documento sempre assinadas e de curta duração (nunca um link público permanente)
- [x] Toda ação sensível gera `AuditLog` (login, upload, download, mudança de status, edição de dados extraídos, contato, envio de mensagem, emissão de parecer, aprovação, contestação, exclusão/anonimização, alteração de permissão, geração de API key)
- [x] Linguagem sempre não-acusatória em toda a interface e no parecer final
- [x] Job de anonimização/exclusão automática ao expirar `retentionUntil` — cron real (`vercel.json` → `/api/cron/retention`, diário às 6h), protegido por `CRON_SECRET`
- [ ] Row Level Security no Postgres como camada extra — ver "Por que não tem RLS ainda" abaixo; decisão deliberada, não um esquecimento

### Por que não tem RLS ainda

Cogitado e pesquisado, não implementado — e o motivo é técnico, não falta de
prioridade. O Prisma conecta no Postgres com a mesma role usada pelas
migrations (essencialmente dona das tabelas), e **essa role ignora RLS por
definição do Postgres** — não é uma configuração que falta ligar, é o
comportamento padrão de qualquer role dona/superusuária. Criar políticas de
RLS hoje, do jeito que a conexão está montada, criaria uma falsa sensação de
proteção: as políticas existiriam no banco, mas a própria aplicação
continuaria ignorando-as em toda query.

Pra RLS realmente proteger alguma coisa aqui, seria preciso: (1) uma role
Postgres separada, sem privilégio de bypass, rodando as queries da
aplicação; (2) políticas baseadas em uma variável de sessão (`current_setting`)
setada a cada requisição; (3) uma extensão do Prisma Client injetando
`SET LOCAL app.org_id = ...` antes de cada query — via transação — em toda a
base de código; e (4) tratamento explícito para os papéis internos
(analista/supervisor/admin), que **legitimamente** enxergam dados de
múltiplas organizações nas telas `/ops` e `/admin`, então a política não
pode ser um simples "trave por organizationId" global. É uma mudança de
arquitetura de acesso a dados de verdade, não um `CREATE POLICY` a mais —
por isso ficou de fora desta rodada, em vez de entrar pela metade.

## Próximos passos

- Integrar um provedor de forense documental (ver seção "Análise
  forense/antifraude") para reativar a verificação de compressão de imagem
  e adulteração localizada — a detecção de geração por IA já está integrada
  (Sightengine, opcional via `AI_DETECTION_PROVIDER`)
- RLS no Postgres — ver "Por que não tem RLS ainda" acima para o que isso realmente exige
- Testes de integração/E2E no fluxo completo de upload → parecer (a suíte unitária real já cobre a lógica pura de decisão — score de risco, similaridade, CID-10, formato de CRM, fuzzy match, telefone, criptografia de segredos)
- Tornar `runCertificateValidationWorkflow` seguro para retry (hoje roda com `retries: 0` no Inngest de propósito — ver `src/inngest/functions.ts`)
- Cobertura de médicos (CRM) e de emissores confiáveis fora dos 10 estados já importados
- Dunning/cobrança automática de fatura vencida além do status `OVERDUE` (hoje só reflete o que o Asaas reporta, não reage a ele)

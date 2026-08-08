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
- Camada de **services** desacoplada para OCR, extração estruturada, validação de médico/clínica, QR Code, forense documental, similaridade, score de risco, WhatsApp e notificações — todas mockadas hoje, com interfaces prontas para plugar provedores reais

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
| `WHATSAPP_PROVIDER`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN` | Integração WhatsApp (mockada por padrão) |
| `WEBHOOK_SECRET` | Segredo usado para assinar payloads de webhook e o fallback de storage local |

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

Hoje o workflow roda **inline** dentro do Server Action/Route Handler que o
dispara (upload no painel do cliente ou `POST .../files` na API pública) —
suficiente para demonstrar o fluxo ponta a ponta sem infraestrutura extra.
Para produção, mova o corpo de `runCertificateValidationWorkflow` para um
job de fila real (veja próxima seção).

## Arquitetura de serviços

```
src/server/services/
  ocr.service.ts                 OcrService (mock)
  extraction.service.ts          MedicalCertificateExtractionService (mock)
  doctor-registry.service.ts     DoctorRegistryService (mock)
  clinic-registry.service.ts     ClinicRegistryService (mock)
  qrcode.service.ts              QrCodeVerificationService (mock)
  forensics.service.ts           DocumentForensicsService (mock)
  similarity.service.ts          DocumentSimilarityService (fingerprint real + matching mock)
  risk-scoring.service.ts        RiskScoringService (determinístico, sem IA — ver seção 17/33 do spec)
  whatsapp.service.ts            WhatsAppService + adapters (Meta/Twilio/Generic, mockados)
  notification.service.ts        NotificationService (in-app + WhatsApp)
  storage.service.ts             StorageAdapter (Supabase real + fallback local)
  webhook-dispatch.service.ts    Disparo assinado (HMAC) de eventos para webhooks de organizações
  workflow.ts                    CertificateValidationWorkflow (orquestrador)
```

Cada serviço mockado é uma classe que implementa uma interface — trocar a
implementação (mock → real) nunca exige tocar nos call sites.

## Como plugar integrações reais

**OCR real** — implemente `OcrService` (`extractText`) chamando Google
Vision, AWS Textract, Azure Document Intelligence ou um worker Tesseract;
troque o export `ocrService` em `ocr.service.ts`.

**Extração estruturada com IA real** — implemente
`MedicalCertificateExtractionService.extractStructuredData` chamando a API
da Anthropic/OpenAI com um schema JSON estrito sobre o texto do OCR.

**Validação de CRM real** — implemente `DoctorRegistryService.verifyDoctor`
apontando para a fonte pública/oficial disponível (ou um provedor de dados
licenciado) no lugar do mock em `doctor-registry.service.ts`.

**Consulta de clínicas/CNPJ/CNES real** — implemente
`ClinicRegistryService.verifyClinic` com chamadas a uma API de CNPJ
(ex.: BrasilAPI/ReceitaWS) e ao CNES (DATASUS), combinando com o cadastro
interno de clínicas já confirmadas em casos anteriores.

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
`Authorization: Bearer <key>` (ou `X-API-Key`).

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
- [ ] Job de anonimização/exclusão automática ao expirar `retentionUntil` (schema pronto; job ainda não agendado — ver Próximos passos)
- [ ] Row Level Security no Postgres como camada extra (hoje o isolamento é garantido na camada de aplicação)

## Próximos passos

- Integrar um provedor de forense documental (ver seção "Análise
  forense/antifraude") para reativar a verificação de compressão de imagem
  e adulteração localizada — a detecção de geração por IA já está integrada
  (Sightengine, opcional via `AI_DETECTION_PROVIDER`)
- Job agendado (cron) para aplicar `DataRetentionPolicy` (anonimizar/expirar registros vencidos)
- Mover o workflow automático para uma fila real (Inngest/Trigger.dev/BullMQ/QStash)
- Regras de decisão automática configuráveis por organização (hoje centralizadas em `risk-scoring.service.ts`)
- RLS no Postgres como defesa em profundidade além do isolamento por `organizationId` na aplicação
- Geração do relatório final em PDF (hoje o parecer é renderizado como HTML/React; `FinalReport.pdfStoragePath` já está no schema)
- Testes automatizados (unitários nos services de scoring/decisão; E2E no fluxo de upload → parecer)

# Como funciona — o pipeline completo

Este documento descreve o que o sistema realmente faz, etapa por etapa,
quando um atestado é enviado. É a fonte da verdade sobre o pipeline — se
algo aqui divergir do código (`src/server/services/workflow.ts`), o código
está certo e este documento está desatualizado; corrija o documento.

## Visão geral do fluxo

```
Upload → Fila (Inngest) → OCR/extração → Validação de médico + clínica (paralelo)
  → QR Code/link de autenticação → Análise técnica do arquivo → Fingerprint
  → Busca de similaridade com casos anteriores → Score de risco → Decisão automática
```

O upload retorna a resposta ao usuário imediatamente — o processamento
inteiro roda em segundo plano, disparado por um evento (`certificate/uploaded`)
processado pelo Inngest, não dentro do próprio request HTTP.

## Etapa por etapa

### 1. OCR e extração estruturada

O documento é lido pela Claude Vision (quando `EXTRACTION_PROVIDER=CLAUDE_VISION`,
o padrão em produção) — uma única chamada de IA que faz duas coisas ao mesmo
tempo: transcreve o texto e extrai os campos estruturados (nome/CRM/UF do
médico, datas, CID, dados da clínica, CPF do paciente). O mesmo arquivo
nunca é lido duas vezes pela IA — o resultado é cacheado pelo hash do
arquivo, então o auto-preenchimento no formulário de envio e o processamento
completo reaproveitam a mesma leitura.

### 2. Validação do médico (CRM)

Não existe API pública do CFM para consulta em tempo real — isso é uma
limitação real do mercado, não só do MedCheck. Por isso a validação segue
uma lógica em camadas, sempre honesta sobre o que sabe:

1. Primeiro, checa um cadastro próprio (`VerifiedDoctor`) de médicos já
   confirmados manualmente por um analista contra o site oficial do CFM.
   Encontrou e o nome bate → **confirmado**. Encontrou mas o nome diverge, ou
   a situação não é "regular" → **divergente**.
2. Não encontrado no cadastro próprio → checa se o formato do CRM/UF é
   plausível. Formato implausível → **não localizado**. Formato plausível
   mas sem confirmação → **inconclusivo** — e o sistema diz exatamente isso,
   nunca finge ter confirmado.

O cadastro próprio cresce por importação manual, estado por estado (ver
`scripts/import-verified-doctors.ts`) — hoje cobre uma parte dos estados, não
todos. Um resultado "inconclusivo" pode significar tanto "o médico não está
regular" quanto "esse estado ainda não foi importado" — são coisas
diferentes, e é importante que quem revisa o caso saiba distinguir.

### 3. Validação da clínica/instituição

Duas fontes reais, em camadas:

1. **CNPJ via Receita Federal** (BrasilAPI, gratuita, sem chave) — confirma
   se o CNPJ existe, está ATIVO, e se a razão social bate com o nome
   declarado no documento. Esta é a checagem primária, sempre em tempo real.
2. **CNES** (Cadastro Nacional de Estabelecimentos de Saúde) — um cadastro
   próprio, importado em massa do Ministério da Saúde (não uma consulta ao
   vivo — não existe API pública de consulta única para isso), usado como
   *enriquecimento* sobre o resultado do CNPJ, nunca para sobrepor ou
   rebaixar o veredito da Receita Federal.

### 4. QR Code / link de autenticação

Quando o documento tem um QR code ou link impresso, o sistema decodifica a
imagem de verdade (não confia no que a extração *disse* que o QR contém) e
compara: o conteúdo decodificado bate com o que a extração leu? O domínio do
link é de uma lista de emissores conhecidos e confiáveis? A URL responde de
verdade? Cada uma dessas perguntas é um sinal separado.

### 5. Análise técnica do arquivo (forense)

Roda em paralelo, olhando pro arquivo em si, não pro conteúdo do texto:

- **Metadados** — assinatura de ferramenta de edição (Photoshop, Canva,
  etc.) no arquivo, gap suspeito entre data de criação e modificação.
- **Camadas do PDF** — quantas revisões o arquivo já sofreu.
- **Tipografia** — quantas famílias de fonte distintas aparecem num
  documento que deveria ser simples.
- **Geração por IA** (opcional, via Sightengine, quando configurado) — um
  provedor externo especializado estima a probabilidade de o documento ter
  sido gerado por IA. Resultado probabilístico, nunca tratado como
  confirmação — mas forte o suficiente para forçar revisão humana quando
  muito alto.

O que **não** roda hoje: verificação de compressão de imagem localizada
(o sinal que pegaria um carimbo ou assinatura colados de outra imagem real).
Foi tentado, não atingiu confiabilidade suficiente para produção, e foi
desativado de propósito em vez de expor um sinal que poderia acusar um
documento legítimo — ver `README.md` na raiz do repositório para o detalhe
técnico completo.

### 6. Fingerprint e similaridade

O documento ganha uma "impressão digital" (hash perceptual da imagem + hash
do texto normalizado) e é comparado contra casos anteriores. Um documento
idêntico ou muito parecido com um caso anterior que **não foi confirmado**
é um sinal forte — o inverso (parecido com um caso que foi confirmado) não
é tratado como sinal positivo, porque atestados legítimos de uma mesma
clínica/template legitimamente se parecem entre si.

### 7. Score de risco e decisão

Tudo acima vira um único score (0-100), com cada ajuste rastreado como
indicador positivo, negativo, ou alerta — nunca um número sem explicação. O
score decide o próximo passo:

| Faixa (padrão global) | Decisão |
|---|---|
| Score > 85, médico confirmado, clínica confirmada ou QR válido, sem alerta grave | Auto-validação (fila de revisão rápida) |
| Score entre 60 e 85 | Revisão humana |
| Score abaixo de 60, ou QR suspeito, ou clínica/médico divergente | Contato com a clínica emissora |
| Score abaixo de 35, ou alerta crítico | Revisão de supervisor |
| Dados insuficientes | Inconclusivo |

Esses limiares (85/60/35 acima) **são configuráveis por organização** em
`/admin/decision-policy` — um cliente pode legitimamente pedir um sistema
mais ou menos criterioso. O que nunca é configurável por cliente é o peso de
cada sinal individual (quanto um CRM divergente derruba o score, por
exemplo) — isso protege a integridade da análise em si.

### Depois da decisão automática

`AUTO_VALIDATE` e `HUMAN_REVIEW` caem na mesma fila de analista — a etiqueta
de score/confiabilidade indica quanto escrutínio o caso ainda precisa, mas
hoje nenhum caso sai do sistema sem algum toque humano. Ver
`../analista/manual-do-analista.md` para o que acontece a partir daqui.

## Sobre o próprio parecer final

O resultado emitido nunca é "atestado falso" ou "fraude confirmada" — é
sempre uma de: confirmado, confirmado com ressalvas, inconclusivo,
inconsistente, não confirmado, ou não reconhecido pela instituição emissora.
A diferença de linguagem é proposital — ver `visao-geral.md`, seção "O que o
produto nunca faz".

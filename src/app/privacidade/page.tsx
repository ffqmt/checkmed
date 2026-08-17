import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const LAST_UPDATED = "17 de agosto de 2026";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center gap-2 px-6 py-5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheck className="size-4" />
          </div>
          <Link href="/" className="text-base font-semibold">
            MedCheck
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-6 py-12 text-sm leading-relaxed text-foreground">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Política de Privacidade</h1>
          <p className="text-xs text-muted-foreground">Última atualização: {LAST_UPDATED}</p>
        </div>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">1. Quem somos</h2>
          <p>
            Esta política se aplica ao MedCheck, plataforma de validação de atestados médicos operada por{" "}
            <strong>57.360.731 FERNANDA FRANCO DE QUEIROZ</strong>, CNPJ 57.360.731/0001-65 (&quot;MedCheck&quot;,
            &quot;nós&quot;). Para dúvidas sobre esta política ou para exercer direitos previstos na Lei Geral de
            Proteção de Dados (LGPD, Lei nº 13.709/2018), entre em contato pelo e-mail{" "}
            <a href="mailto:medcheck@francotech.com.br" className="text-primary underline underline-offset-2">
              medcheck@francotech.com.br
            </a>
            .
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">2. O que o MedCheck faz</h2>
          <p>
            O MedCheck é contratado por empresas (&quot;empresa cliente&quot;) para validar a autenticidade de
            atestados médicos enviados por seus colaboradores, verificando dados como médico emissor (CRM),
            clínica/instituição emissora (CNPJ), código de autenticação (QR Code) e indícios técnicos de
            manipulação do documento. O MedCheck atua como operador de dados, processando as informações por
            instrução e em nome da empresa cliente, para essa finalidade específica de validação documental.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">3. Quais dados tratamos</h2>
          <p>Ao usar o MedCheck, tratamos:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Dados do atestado enviado</strong>: nome do colaborador, CPF (armazenado de forma mascarada),
              nome e CRM do médico, dados da clínica/instituição emissora, datas de afastamento e, quando presente
              no documento, o código CID (classificação da doença) — tratado como dado sensível de saúde (art. 5º,
              II da LGPD) e restrito mesmo internamente: nunca é exibido à empresa cliente, apenas usado para
              verificar o formato/validade do código.
            </li>
            <li>
              <strong>Dados de quem usa a plataforma</strong>: nome, e-mail e, quando informado, telefone de
              usuários da empresa cliente, usados para autenticação e para notificações sobre o andamento das
              solicitações.
            </li>
            <li>
              <strong>Dados técnicos do arquivo enviado</strong>: hash do arquivo e metadados do documento, usados
              para detectar duplicidade e indícios de manipulação.
            </li>
          </ul>
          <p>
            O MedCheck <strong>não possui canal de contato direto com o colaborador</strong> cujo atestado é
            analisado — a relação de tratamento de dados ocorre entre o MedCheck e a empresa cliente, que é
            responsável por informar seus colaboradores sobre esse processamento.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">4. Por que tratamos esses dados</h2>
          <p>
            A base legal para o tratamento é a execução de contrato entre o MedCheck e a empresa cliente, e o
            cumprimento de obrigação legal / exercício regular de direitos pela empresa cliente no contexto da
            relação de trabalho com seus colaboradores (art. 7º, V, e art. 11, II, &quot;a&quot;, da LGPD, para dados
            sensíveis de saúde).
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">5. Com quem compartilhamos dados</h2>
          <p>Para operar o serviço, usamos os seguintes prestadores, sempre limitados à finalidade de validação documental:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Supabase</strong> — hospedagem de banco de dados e armazenamento de arquivos.</li>
            <li><strong>Anthropic (Claude)</strong> — leitura e extração automática dos dados do documento enviado.</li>
            <li><strong>Receita Federal</strong>, via BrasilAPI — consulta da situação cadastral do CNPJ da clínica/instituição emissora.</li>
            <li><strong>Meta (WhatsApp Business API)</strong>, quando configurado pela empresa cliente — notificações sobre o andamento de solicitações.</li>
            <li><strong>Sightengine</strong>, quando configurado — análise técnica de possível geração de imagem por inteligência artificial.</li>
          </ul>
          <p>Não vendemos dados a terceiros nem os usamos para fins publicitários.</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">6. Por quanto tempo guardamos os dados</h2>
          <p>
            Cada empresa cliente configura seu próprio prazo de retenção (padrão: 365 dias a partir da conclusão da
            solicitação), podendo optar por anonimização ou exclusão automática dos arquivos ao final desse prazo.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">7. Segurança</h2>
          <p>
            Credenciais de integração com terceiros são armazenadas de forma criptografada. O acesso aos dados é
            restrito por papel (analista, supervisor, administrador) e todo acesso relevante é registrado em log de
            auditoria.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">8. Direitos do titular</h2>
          <p>
            Nos termos da LGPD, o titular dos dados (o colaborador cujo atestado foi analisado) tem direito a
            solicitar, por meio da empresa cliente: confirmação e acesso aos dados, correção, anonimização,
            exclusão e portabilidade (exportação) dos dados tratados. Esses pedidos podem ser feitos pela empresa
            cliente diretamente na plataforma, ou pelo colaborador diretamente junto à sua empresa.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">9. Alterações desta política</h2>
          <p>Podemos atualizar esta política periodicamente. A data da última atualização está indicada no topo desta página.</p>
        </section>
      </main>
    </div>
  );
}

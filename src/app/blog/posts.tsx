import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string; // ISO date
  readingMinutes: number;
  body: ReactNode;
};

const LegalDisclaimer = () => (
  <div className="mt-10 rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
    Este texto é uma síntese informativa, não um parecer jurídico. As situações reais variam — antes de transformar
    qualquer ponto aqui em política interna que rejeite ou desconte um atestado, vale confirmar com um advogado
    trabalhista.
  </div>
);

export const posts: BlogPost[] = [
  {
    slug: "cfm-1658-cid-no-atestado",
    title: "O paciente decide se o CID aparece no atestado — e isso muda como o RH deve tratar o documento",
    excerpt:
      "A Resolução CFM 1658/2002 dá ao paciente, não ao médico ou ao empregador, o direito de decidir se o diagnóstico aparece no atestado. Entenda o que isso significa na prática para quem recebe o documento.",
    publishedAt: "2026-08-19",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Um atestado médico sem CID não é um atestado incompleto. Na maioria das vezes, é exatamente o documento que
          deveria ter sido emitido.
        </p>
        <p>
          A <strong>Resolução CFM nº 1.658/2002</strong> estabelece que cabe ao <em>paciente</em> — não ao médico, e
          muito menos ao empregador — decidir se o diagnóstico (o código CID) vai constar no atestado. O médico é
          obrigado a fornecer, quando solicitado, uma via sem o CID, mantendo apenas as informações sobre o afastamento:
          período de repouso necessário e, se for o caso, o código correspondente à doença apenas quando o próprio
          paciente autorizar.
        </p>
        <h2>Por que isso existe</h2>
        <p>
          O diagnóstico é, por definição, dado de saúde — e dado de saúde é dado sensível. Divulgá-lo para alguém fora
          da relação médico-paciente sem necessidade (o RH de uma empresa, por exemplo) expõe o paciente a um risco que
          não tem relação com o motivo real do afastamento: julgamento, constrangimento, ou até discriminação por
          conta de uma condição de saúde que não é da conta de ninguém além do próprio paciente e de quem o trata.
        </p>
        <h2>O que isso significa para quem recebe o atestado</h2>
        <p>Na prática, três coisas decorrem diretamente disso:</p>
        <ul>
          <li>
            <strong>Um atestado sem CID visível não é, por si só, um sinal de alerta.</strong> É o exercício normal de
            um direito do paciente, prescrito por resolução do próprio conselho de medicina.
          </li>
          <li>
            <strong>O RH não tem — e não deveria buscar ter — acesso rotineiro ao diagnóstico.</strong> O que importa
            para fins de abono de falta é a validade do atestado (médico habilitado, instituição real, período
            coerente), não o motivo clínico por trás dele.
          </li>
          <li>
            <strong>Quando o CID aparece, ele merece o mesmo cuidado que qualquer outro dado sensível de saúde</strong>{" "}
            — acesso restrito, nunca exibido sem necessidade, e nunca usado como critério de decisão sobre o vínculo
            de trabalho.
          </li>
        </ul>
        <p>
          É esse o motivo pelo qual qualquer sistema que valide atestados em nome de uma empresa precisa nascer
          desenhado para nunca depender do diagnóstico como sinal — a validação real está em outro lugar: em quem
          assinou, de onde veio, e se os dados batem entre si.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "lei-605-quem-pode-emitir-atestado",
    title: "Nem todo atestado vale igual — a Lei 605/49 diz quem pode emitir um que garante a falta sem desconto",
    excerpt:
      "O Art. 6º da Lei 605/1949 lista, taxativamente, quais categorias de médico/instituição podem emitir um atestado que impede o desconto do dia. A lista é mais ampla — e mais específica — do que a maioria imagina.",
    publishedAt: "2026-08-19",
    readingMinutes: 5,
    body: (
      <>
        <p>
          Quando um atestado chega para o RH, a pergunta mais comum é &ldquo;esse médico existe e esse CRM é válido?&rdquo;. É
          uma pergunta necessária, mas incompleta. A Lei 605/1949, que regula o repouso semanal remunerado, também
          define <em>quem</em> pode emitir um atestado com efeito de abonar a falta sem desconto — e essa lista, no
          Art. 6º, é mais específica do que parece à primeira vista.
        </p>
        <h2>As categorias que a lei reconhece</h2>
        <p>De forma resumida, o atestado precisa vir de uma das seguintes origens:</p>
        <ul>
          <li>Médico da própria empresa, ou de convênio/serviço médico mantido por ela;</li>
          <li>Perícia do INSS (Instituto Nacional do Seguro Social);</li>
          <li>Médico do sindicato da categoria profissional do empregado;</li>
          <li>
            <strong>
              Médico a serviço de repartição federal, estadual ou municipal de saúde pública — ou seja, qualquer
              unidade do SUS
            </strong>
            , não apenas uma autoridade sanitária específica.
          </li>
        </ul>
        <p>
          Esse último ponto costuma ser subestimado. Não é uma categoria residual, usada só quando não há médico de
          empresa ou sindicato disponível — é uma categoria ampla e incondicional, que cobre qualquer atendimento em
          UBS, UPA, hospital público ou posto de saúde do SUS. Na prática, é provavelmente a origem mais comum de
          atestados reais no Brasil, dado o alcance do sistema público de saúde.
        </p>
        <h2>O que isso muda na prática</h2>
        <p>
          Entender essa lista evita dois erros opostos. O primeiro é achar que &ldquo;qualquer atestado assinado por
          qualquer médico&rdquo; resolve — a lei é mais específica que isso, ainda que na prática a imensa maioria dos
          atestados reais se encaixe em uma das categorias acima. O segundo erro, mais comum, é o oposto: tratar um
          atestado de posto de saúde ou UPA como &ldquo;fora da rede&rdquo; ou menos confiável só por não vir de uma clínica
          particular conveniada. Não é essa a lógica da lei — o SUS está expressamente incluído, sem ressalva.
        </p>
        <h2>Onde a atenção real deveria estar</h2>
        <p>
          Dado que a maioria dos atestados legítimos vai se encaixar em uma dessas categorias amplas, o valor de
          verificar um atestado não está em restringir por rede ou convênio — está em confirmar que a categoria
          declarada é real: o médico existe e está regular no conselho de classe, a clínica ou unidade de saúde
          declarada existe de fato, e os dados do documento (datas, período de afastamento, identificação do
          paciente) são internamente consistentes.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "lgpd-dado-de-saude-sensivel",
    title: "Atestado médico é dado de saúde — e dado de saúde é dado sensível para a LGPD",
    excerpt:
      "A LGPD trata dado de saúde como categoria especial (Art. 5º, II), com regras próprias de tratamento (Art. 11). O que isso exige, na prática, de quem recebe e guarda atestados médicos de colaboradores.",
    publishedAt: "2026-08-19",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Toda empresa que recebe atestados médicos de colaboradores está, no vocabulário da LGPD, tratando dado
          pessoal sensível. Não é uma interpretação extensiva — o <strong>Art. 5º, II</strong> da Lei Geral de
          Proteção de Dados lista &ldquo;dado referente à saúde&rdquo; explicitamente entre as categorias de dado sensível, ao
          lado de origem racial, convicção religiosa e orientação sexual.
        </p>
        <h2>O que muda quando um dado é &ldquo;sensível&rdquo;</h2>
        <p>
          A LGPD não trata todo dado pessoal da mesma forma. Dado sensível tem tratamento reforçado — o{" "}
          <strong>Art. 11</strong> exige uma base legal específica para seu tratamento (consentimento destacado, ou
          uma das hipóteses legais como cumprimento de obrigação legal/regulatória), e o risco de um incidente
          envolvendo esse tipo de dado é tratado com mais gravidade pela própria lei e pela ANPD.
        </p>
        <p>Na prática cotidiana de RH, isso se traduz em obrigações concretas:</p>
        <ul>
          <li>
            <strong>Minimização</strong> — guardar só o que é necessário para a finalidade (comprovar o afastamento),
            não o prontuário inteiro nem o diagnóstico quando ele não é necessário para essa finalidade.
          </li>
          <li>
            <strong>Acesso restrito</strong> — nem todo mundo no RH precisa ver o atestado completo; menos ainda
            colegas de equipe ou gestores diretos sem necessidade real.
          </li>
          <li>
            <strong>Retenção com prazo</strong> — guardar indefinidamente &ldquo;por segurança&rdquo; não é uma prática segura sob
            a LGPD; é o oposto: um passivo. Deveria existir um prazo definido, ligado à finalidade, depois do qual o
            dado é anonimizado ou eliminado.
          </li>
          <li>
            <strong>Direitos do titular</strong> — o colaborador tem o direito de saber o que a empresa guarda sobre
            ele, pedir correção, e em muitos casos pedir eliminação — direitos que a empresa precisa conseguir
            atender, não só reconhecer no papel.
          </li>
        </ul>
        <h2>O ponto que mais passa despercebido</h2>
        <p>
          O CID (diagnóstico) é o núcleo mais sensível dentro de um documento que já é sensível por inteiro. É por
          isso que a boa prática não é &ldquo;teoricamente restringir o acesso ao CID&rdquo; — é fazer com que o dado nem chegue a
          quem não precisa dele, com máscara/redação por padrão, e nunca como critério documentado de decisão sobre o
          vínculo empregatício.
        </p>
        <p>
          Tratar isso corretamente não é burocracia extra — é a diferença entre um processo de RH auditável e um
          passivo esperando para acontecer.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

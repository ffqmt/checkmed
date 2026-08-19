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
  {
    slug: "pergunta-que-rh-evita",
    title: "A pergunta que todo RH evita fazer sobre atestados",
    excerpt:
      "Não é 'esse atestado é falso?'. É uma pergunta bem mais desconfortável — e é ela que decide se o seu processo é sólido ou só sorte.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Não é &ldquo;esse atestado é falso?&rdquo;. Essa pergunta é fácil — quase sempre a resposta é não, e a
          desconfiança nem chega a virar palavra. A pergunta que realmente incomoda é outra: <em>&ldquo;se este
          aqui fosse falso, a gente teria como saber?&rdquo;</em>.
        </p>
        <p>
          Na maioria das empresas, a resposta honesta é não. Não porque o RH seja displicente — porque simplesmente
          não existe, hoje, uma forma prática de confirmar médico, clínica e dados de um atestado em minutos, sem
          telefonema, sem depender da sorte de encontrar alguém disponível na clínica, sem virar um projeto paralelo
          no meio da rotina de quem já tem a agenda cheia.
        </p>
        <p>
          O problema não é a falta de cuidado de quem está no RH. É a falta de ferramenta pra transformar cuidado em
          verificação de verdade.
        </p>
        <h2>Por que isso incomoda mais do que parece</h2>
        <p>
          Porque a resposta &ldquo;a gente confia&rdquo; funciona perfeitamente bem — até o dia em que não funciona. E
          quando não funciona, quem respondeu &ldquo;a gente confia&rdquo; pro jurídico, pro financeiro, pra
          diretoria, é a mesma pessoa que vai ter que explicar por que não havia processo nenhum por trás dessa
          confiança.
        </p>
        <p>
          Não é sobre desconfiar de quem apresenta o atestado. É sobre ter, quando alguém perguntar, uma resposta
          melhor do que &ldquo;a gente sempre fez assim&rdquo;.
        </p>
      </>
    ),
  },
  {
    slug: "5-mitos-atestado-medico",
    title: "5 mitos sobre atestado médico que o RH ainda acredita",
    excerpt:
      "Do 'sem CID não vale' ao 'atestado de posto de saúde é menos confiável' — cinco crenças comuns no RH que não têm respaldo nenhum na lei.",
    publishedAt: "2026-08-20",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Alguns desses mitos são tão repetidos dentro do RH que viraram &ldquo;regra da casa&rdquo; em empresas que
          nunca pararam pra checar se a regra tinha algum respaldo real. Cinco dos mais comuns:
        </p>
        <h2>1. &ldquo;Atestado sem CID não vale&rdquo;</h2>
        <p>
          Vale, sim — e mais que isso: é um direito do paciente pedir a via sem CID, garantido pela Resolução CFM
          1658/2002. Um atestado sem diagnóstico visível não é incompleto; é o documento correto na maioria das
          vezes.
        </p>
        <h2>2. &ldquo;Atestado de posto de saúde/UPA é menos confiável que de clínica particular&rdquo;</h2>
        <p>
          A Lei 605/49 inclui qualquer unidade do SUS entre as fontes válidas, sem ressalva nenhuma. Não existe
          hierarquia de confiabilidade entre &ldquo;público&rdquo; e &ldquo;particular&rdquo; na lei — só existe
          atestado que vem de uma fonte válida ou não.
        </p>
        <h2>3. &ldquo;Se o atestado é de outro estado, não vale&rdquo;</h2>
        <p>
          O CRM é registrado por estado, mas isso regula onde o médico exerce, não onde o paciente pode ser
          atendido. Um profissional regular em seu estado pode atender e emitir atestado legitimamente para alguém
          de fora, dentro das regras do próprio conselho.
        </p>
        <h2>4. &ldquo;Assinatura ilegível é sinal de problema&rdquo;</h2>
        <p>
          É sinal de letra de médico, na maioria das vezes. Uma assinatura difícil de ler não é, isoladamente, um
          indício de nada — o que importa é se o CRM e o carimbo (quando presentes) permitem identificar o
          profissional.
        </p>
        <h2>5. &ldquo;Atestado com data retroativa é sempre suspeito&rdquo;</h2>
        <p>
          Pode ser — mas também pode simplesmente refletir quando a consulta realmente aconteceu versus quando o
          documento chegou ao RH. Vale atenção, não descarte automático.
        </p>
        <p>
          O fio comum entre esses cinco mitos: nenhum deles vem da lei. Vêm de repetição — alguém decidiu assim uma
          vez, e a decisão virou cultura sem nunca ser questionada.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "parece-falso-nao-basta",
    title: "“Parece falso” não é motivo suficiente — e pode custar caro pra sua empresa",
    excerpt:
      "A intuição de quem recebe o atestado é um dado real. Mas sozinha, sem nada documentado por trás, é também o jeito mais rápido de transformar uma suspeita em passivo trabalhista.",
    publishedAt: "2026-08-20",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Toda pessoa que já trabalhou recebendo atestados desenvolveu, com o tempo, um instinto. Um papel que não
          parece certo, uma letra estranha demais, uma clínica que ninguém nunca ouviu falar. Esse instinto é real e
          não deveria ser ignorado — mas ele tem um limite perigoso: não é prova de nada, e decisão trabalhista
          baseada só em &ldquo;não me pareceu certo&rdquo; é decisão sem base documental nenhuma por trás.
        </p>
        <h2>O problema não é desconfiar. É parar na desconfiança.</h2>
        <p>
          Descontar um dia de um colaborador, ou tratar um atestado como inválido, com base numa impressão — sem
          checar CRM, sem confirmar a clínica, sem registrar nada do processo — deixa a empresa exposta exatamente no
          ponto em que ela achava que estava se protegendo. Se o colaborador contestar, o que existe pra sustentar a
          decisão? Uma sensação não vira documento.
        </p>
        <h2>O caminho que protege dos dois lados</h2>
        <p>
          A intuição de quem recebe o atestado deveria ser o <em>início</em> de uma verificação, não o <em>fim</em>
          dela. Confirmar CRM, confirmar CNPJ da clínica, olhar se as datas fecham, registrar o que foi checado — isso
          transforma &ldquo;não me pareceu certo&rdquo; em algo que se sustenta se alguém perguntar depois.
        </p>
        <p>
          E funciona nos dois sentidos: às vezes o instinto está certo, e agora existe base pra agir. Às vezes o
          instinto está errado — a letra ruim era só letra ruim — e a verificação evita um erro que teria custado
          muito mais caro que os cinco minutos que levou pra confirmar.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "justa-causa-atestado-falso",
    title: "Quando a demissão por justa causa por atestado falso pode (e não pode) acontecer",
    excerpt:
      "É a palavra que assusta todo mundo envolvido — mas justa causa por atestado falso não é automática, e agir rápido demais pode virar o problema da empresa, não do colaborador.",
    publishedAt: "2026-08-20",
    readingMinutes: 5,
    body: (
      <>
        <p>
          &ldquo;Justa causa por atestado falso&rdquo; é a frase que aparece quando a paciência do RH já se esgotou.
          Mas entre desconfiar de um atestado e demitir por justa causa existe uma distância que vale entender antes
          de qualquer decisão — porque errar nessa distância custa caro nos dois sentidos.
        </p>
        <h2>O que a justa causa exige, em princípio</h2>
        <p>
          A CLT (Art. 482) trata falsidade documental como uma das hipóteses que podem justificar a rescisão por
          justa causa. Mas &ldquo;podem justificar&rdquo; não é &ldquo;justificam automaticamente&rdquo; — o que
          normalmente se exige é prova consistente de que o documento é de fato inválido (não apenas duvidoso), e
          proporcionalidade entre a gravidade do ato e a penalidade aplicada. Não é uma linha reta de &ldquo;pareceu
          estranho&rdquo; até &ldquo;demissão sem direitos&rdquo;.
        </p>
        <h2>Onde as empresas mais erram</h2>
        <p>
          Não é em ser rigorosas demais nem em ser complacentes demais — é em pular a etapa do meio: a verificação
          documentada. Decidir com base em suspeita não confirmada expõe a empresa a reverter a demissão depois, com
          custo (inclusive reputacional) maior do que se tivesse simplesmente investigado primeiro.
        </p>
        <h2>O que costuma sustentar melhor uma decisão dessas</h2>
        <ul>
          <li>Confirmação (não suposição) de que o médico ou a clínica não são reais.</li>
          <li>Tentativa documentada de contato com a instituição emissora.</li>
          <li>Consistência — o mesmo padrão de verificação aplicado sempre, não só quando &ldquo;parece
          suspeito&rdquo;.</li>
          <li>Registro de todo o processo, não só da conclusão.</li>
        </ul>
        <p>
          A palavra &ldquo;justa causa&rdquo; carrega peso emocional dos dois lados — pra quem decide e pra quem é
          decidido. Ter processo documentado não torna a decisão mais fácil emocionalmente, mas torna ela mais
          defensável, o que, no fim, protege as duas partes de um erro irreversível.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "conta-que-ninguem-faz",
    title: "A conta que ninguém faz: quanto custa verificar um atestado na unha",
    excerpt:
      "Ninguém bota no orçamento o tempo que o RH perde ligando pra clínica, procurando médico no Google, decidindo no sentimento. Mas esse custo existe — só está escondido.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Pergunta simples: quanto custa, hoje, verificar um atestado na sua empresa? Se a resposta for &ldquo;a
          gente não verifica&rdquo;, tudo bem — mas essa resposta também tem custo, só que ele aparece depois, como
          risco assumido em silêncio.
        </p>
        <p>
          Se a resposta for &ldquo;a gente verifica quando dá pra desconfiar&rdquo;, vale somar o que isso realmente
          consome: o tempo de alguém procurando o CRM do médico numa busca genérica, tentando confirmar se a clínica
          existe, ligando e esperando alguém atender, registrando (ou não registrando) o que foi encontrado. Multiplique
          isso pelo número de vezes que aconteceu esse ano — mesmo que só nos casos que &ldquo;pareceram
          estranhos&rdquo;.
        </p>
        <h2>O custo que ninguém vê no orçamento</h2>
        <p>
          Esse tempo não aparece em nenhuma planilha de custo do RH, porque é tempo &ldquo;emprestado&rdquo; de outras
          tarefas, não uma linha orçamentária própria. Isso não significa que ele seja de graça — significa que
          ninguém está medindo.
        </p>
        <p>
          A pergunta que vale fazer não é &ldquo;quanto custa automatizar isso?&rdquo;. É &ldquo;quanto já está
          custando não automatizar?&rdquo; — só que, hoje, ninguém sabe responder, porque ninguém somou.
        </p>
      </>
    ),
  },
  {
    slug: "checklist-antes-de-questionar",
    title: "Checklist: 8 coisas pra olhar antes de questionar um atestado",
    excerpt:
      "Antes de escalar uma suspeita, vale passar por uma lista curta e objetiva — evita tanto aceitar um documento problemático quanto questionar um colaborador injustamente.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Uma lista curta, pra rodar antes de decidir que algo está errado com um atestado — o objetivo não é achar
          motivo pra desconfiar, é ter uma base concreta antes de agir em qualquer direção.
        </p>
        <ol>
          <li><strong>O CRM tem formato válido?</strong> Número + UF, sem coisas óbvias faltando.</li>
          <li><strong>O nome do médico bate com o CRM informado?</strong> Nomes muito genéricos ou claramente
          incompletos merecem uma segunda olhada.</li>
          <li><strong>A clínica/instituição existe de fato?</strong> Um CNPJ ou nome pesquisável é o mínimo.</li>
          <li><strong>As datas fazem sentido entre si?</strong> Emissão, início e fim do afastamento precisam ser
          consistentes.</li>
          <li><strong>O período declarado bate com os dias corridos calculados?</strong> Uma conta simples que muita
          gente pula.</li>
          <li><strong>Tem CID visível?</strong> Se não tiver, lembre: isso é direito do paciente, não falha do
          documento.</li>
          <li><strong>Tem QR code ou link de autenticação?</strong> Se tiver, ele realmente abre e confirma o que o
          documento diz?</li>
          <li><strong>Esse padrão de verificação foi aplicado a todos os atestados recentes, não só a este?</strong>
          Consistência importa tanto quanto rigor.</li>
        </ol>
        <p>
          Nenhum item sozinho decide nada. É a combinação — e principalmente a consistência de aplicar essa mesma
          lista sempre, não só quando alguma coisa &ldquo;parece estranha&rdquo; — que transforma isso de intuição em
          processo.
        </p>
      </>
    ),
  },
  {
    slug: "paciente-tambem-tem-direitos",
    title: "O paciente também tem direitos no atestado — e isso não é contra a empresa",
    excerpt:
      "É fácil enxergar as proteções ao paciente como obstáculo pro RH. Mas entender por que elas existem muda a forma de lidar com o documento — pra melhor, dos dois lados.",
    publishedAt: "2026-08-20",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Quando o RH esbarra pela primeira vez na ideia de que o paciente pode pedir uma via do atestado sem o CID,
          a reação inicial costuma ser de desconfiança: &ldquo;isso dificulta nosso trabalho&rdquo;. É uma reação
          compreensível — mas vale entender o outro lado antes de decidir que é um obstáculo.
        </p>
        <h2>Por que essa proteção existe</h2>
        <p>
          O diagnóstico de alguém não é, e não deveria ser, informação de domínio do empregador. Uma pessoa em
          tratamento de saúde mental, ou de uma condição que carrega estigma, tem o direito de se ausentar pelo tempo
          necessário sem que isso vire informação circulando pela empresa. Essa não é uma regra pensada contra o RH —
          é uma proteção pensada para alguém numa posição vulnerável, que é justamente quem está doente.
        </p>
        <h2>O que isso muda na prática — e o que não muda</h2>
        <p>
          Não muda o que realmente importa pra decisão de abonar ou não a falta: se o médico existe, se a clínica é
          real, se o período faz sentido. O CID nunca foi, tecnicamente, o dado que valida um atestado — é o dado que
          faz parecer que valida, porque dá a sensação de mais informação.
        </p>
        <p>
          Entender essa proteção como legítima, em vez de como obstáculo, também protege a empresa: tratar o CID como
          critério de decisão é um risco de LGPD desnecessário para resolver um problema que nunca precisou dele.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "sus-convenio-particular-vale-igual",
    title: "SUS, convênio, particular: todo atestado vale igual?",
    excerpt:
      "A resposta curta é sim — mas o RH raramente trata assim na prática. Um guia rápido de onde a lei realmente traça a diferença, e onde ela não traça nenhuma.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          A pergunta aparece o tempo todo, de formas diferentes: &ldquo;esse atestado é de posto de saúde, conta
          igual?&rdquo;, &ldquo;é de convênio, precisa de algo a mais?&rdquo;. A resposta curta é sim, valem igual —
          desde que venham de uma fonte reconhecida pela lei. A resposta longa explica por quê.
        </p>
        <h2>O que realmente diferencia um atestado válido de um que não é</h2>
        <p>
          A Lei 605/49 não separa por tipo de instituição financiadora (público, convênio, particular) — separa por
          <em>categoria de emissor</em>: médico da empresa/convênio próprio, perícia do INSS, médico do sindicato, ou
          qualquer médico a serviço de unidade pública de saúde. SUS está incluído nessa última categoria, de forma
          ampla, sem ressalva.
        </p>
        <h2>Onde a confusão realmente mora</h2>
        <p>
          Não é entre público e particular — é entre <em>emissor reconhecido</em> e <em>emissor não reconhecido</em>.
          Um atestado de uma unidade pública de saúde é tão válido quanto um de clínica particular conveniada. O que
          precisa ser verificado é o mesmo nos dois casos: o médico existe e está regular, a instituição é real.
        </p>
        <p>
          Tratar atestado de posto de saúde como &ldquo;categoria inferior&rdquo; não é rigor — é um viés sem
          respaldo legal, que na prática penaliza desproporcionalmente quem depende do SUS.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "rh-nao-e-detetive",
    title: "Por que seu RH não deveria ser o detetive de atestados",
    excerpt:
      "Toda empresa que não tem processo de verificação acaba terceirizando essa função, sem querer, pra intuição de uma pessoa só. Isso não é justo com ninguém.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Em algum momento, em quase toda empresa sem processo formal, alguém do RH vira, sem ter pedido, o
          &ldquo;detetive de atestados&rdquo; — a pessoa cuja intuição decide o que passa e o que não passa. Isso
          raramente é um cargo formal. É uma função que aparece sozinha, no vácuo de um processo que não existe.
        </p>
        <h2>O peso que isso coloca numa pessoa só</h2>
        <p>
          Decidir se confia ou não num documento, sem ferramenta nenhuma além do próprio julgamento, é uma
          responsabilidade desproporcional ao cargo. E quando algo dá errado — um atestado aceito que não deveria
          ter sido, ou recusado indevidamente — a pergunta que sobra é &ldquo;por que você não percebeu?&rdquo;, como
          se houvesse alguma forma de ter percebido sem informação nenhuma pra isso.
        </p>
        <h2>O que muda quando existe processo</h2>
        <p>
          Não é sobre tirar o julgamento humano da equação — é sobre dar pra essa pessoa a informação que faltava
          antes de precisar confiar só no instinto. Verificação de médico, de clínica, de consistência de dados —
          isso não substitui quem decide, dá pra quem decide algo real pra se apoiar.
        </p>
        <p>
          Ninguém deveria carregar sozinho o peso de ser o filtro contra fraude de uma empresa inteira, usando só a
          própria intuição como ferramenta.
        </p>
      </>
    ),
  },
  {
    slug: "o-que-conta-como-atestado-medico",
    title: "Atestado odontológico, psicológico, fisioterapêutico: o que vale como atestado médico?",
    excerpt:
      "Nem todo documento que parece um atestado tem o mesmo efeito legal. Um guia rápido pelas categorias que geram dúvida real no dia a dia do RH.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Um documento chega, tem carimbo, tem assinatura, parece um atestado — mas é de um dentista, ou de um
          psicólogo, ou de um fisioterapeuta. Vale igual a um atestado médico? A resposta muda conforme quem emitiu.
        </p>
        <h2>Odontológico</h2>
        <p>
          Cirurgiões-dentistas têm respaldo legal próprio para emitir atestado que justifica afastamento — não é uma
          zona cinzenta, é uma categoria reconhecida com regras próprias.
        </p>
        <h2>Psicológico</h2>
        <p>
          Aqui a situação é mais delicada: um atestado assinado só por psicólogo (sem CRP com respaldo específico
          para esse efeito, dependendo do contexto) nem sempre tem o mesmo peso automático de um atestado médico
          para fins de abono — vale atenção redobrada e, em caso de dúvida real, orientação jurídica específica, já
          que essa é uma das áreas onde a prática varia mais.
        </p>
        <h2>Fisioterapêutico e outras categorias</h2>
        <p>
          Cada profissão de saúde regulamentada tem seu próprio conselho e suas próprias regras sobre o que pode
          emitir e com qual efeito. Tratar todo documento com carimbo de profissional de saúde como automaticamente
          equivalente é um erro comum — e tratar todos com desconfiança automática também é.
        </p>
        <p>
          A regra prática: identifique quem assinou, confirme o registro dessa pessoa no conselho correspondente, e
          trate a categoria profissional como parte da verificação, não como detalhe menor.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "quando-inss-assume",
    title: "O afastamento que vira dor de cabeça: quando o INSS assume (e quando não assume)",
    excerpt:
      "A partir do 16º dia consecutivo de afastamento, a responsabilidade muda de mãos — e isso muda também o que a empresa precisa (e não precisa mais) verificar.",
    publishedAt: "2026-08-20",
    readingMinutes: 4,
    body: (
      <>
        <p>
          Um afastamento curto e um afastamento longo não são o mesmo tipo de problema pro RH — e tratar os dois com
          o mesmo processo costuma gerar confusão desnecessária.
        </p>
        <h2>A regra que divide as águas</h2>
        <p>
          Pelas regras da Previdência, a empresa é responsável por remunerar os primeiros 15 dias consecutivos de
          afastamento por doença. A partir do 16º dia, a responsabilidade migra para o INSS, mediante perícia
          própria — deixa de ser um atestado que a empresa avalia e vira um benefício que o próprio INSS concede ou
          não, com sua própria perícia médica.
        </p>
        <h2>Por que isso importa pro processo de verificação</h2>
        <p>
          Verificar o atestado que justifica os primeiros dias continua sendo responsabilidade e interesse direto da
          empresa. Mas, uma vez que o afastamento ultrapassa esse período e o INSS assume, o papel da empresa muda de
          natureza — de quem avalia a validade do atestado inicial para quem acompanha o retorno e a documentação
          da perícia do próprio INSS.
        </p>
        <p>
          Empresas que não têm essa transição clara no processo acabam com duas dores de cabeça diferentes tratadas
          como se fossem uma só — o que gasta energia de verificação onde ela já não muda mais nada, e tira atenção
          de onde ela realmente importa: os primeiros 15 dias.
        </p>
        <LegalDisclaimer />
      </>
    ),
  },
  {
    slug: "home-office-nao-resolveu",
    title: "Trabalho híbrido não acabou com o problema do atestado — só mudou o jeito",
    excerpt:
      "A distância física que o modelo híbrido trouxe também tirou a última camada informal de verificação que existia: alguém simplesmente ver o colaborador doente de verdade.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Numa empresa totalmente presencial, sempre existiu uma camada informal (e imperfeita) de verificação:
          alguém do time via o colega chegando mal, ou soube por outras pessoas que ele realmente estava doente. Não
          era um processo — mas era alguma coisa. No modelo híbrido ou remoto, mesmo essa camada informal
          desapareceu.
        </p>
        <h2>O que mudou de verdade</h2>
        <p>
          O atestado hoje chega quase sempre por foto de celular, direto pro RH, sem nenhum contexto humano ao redor.
          Ninguém viu o colaborador, ninguém tem uma sensação sobre a situação — só existe o documento em si, e a
          decisão precisa se apoiar inteiramente nele.
        </p>
        <h2>Por que isso torna a verificação mais necessária, não menos</h2>
        <p>
          Quando a única informação disponível é o próprio papel, a qualidade da verificação desse papel importa
          proporcionalmente mais. O modelo híbrido não criou o problema da verificação de atestados — só removeu a
          última rede de segurança informal que mascarava a ausência de um processo real.
        </p>
        <p>
          Empresas que se adaptaram bem ao trabalho remoto em quase tudo, mas mantiveram o processo de atestado
          igual a antes, estão com uma lacuna que só fica visível quando alguém pergunta.
        </p>
      </>
    ),
  },
  {
    slug: "clinica-que-nao-existe",
    title: "O que fazer quando a clínica no atestado “não existe”",
    excerpt:
      "Antes de tratar isso como sinal de alarme, vale considerar as explicações mais comuns — a maioria não tem nada a ver com má-fé.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          A primeira busca não retorna nada. O nome da clínica no atestado &ldquo;não existe&rdquo;, pelo menos não
          do jeito que foi escrito. Antes de qualquer conclusão, vale considerar o que costuma explicar isso na
          prática.
        </p>
        <h2>As explicações mais comuns — nenhuma delas é fraude</h2>
        <ul>
          <li><strong>Nome fantasia versus razão social.</strong> A clínica pode ser conhecida popularmente por um
          nome diferente do que está registrado oficialmente.</li>
          <li><strong>Erro de grafia na extração ou na digitação.</strong> Letra difícil de ler, OCR imperfeito, ou
          simplesmente um erro de quem preencheu.</li>
          <li><strong>Unidade recém-aberta ou recém-fechada.</strong> Cadastros oficiais podem estar desatualizados
          em relação à realidade.</li>
          <li><strong>Busca pelo termo errado.</strong> CNPJ é uma busca muito mais confiável que nome — vale checar
          pelos dois.</li>
        </ul>
        <h2>Quando vale escalar de verdade</h2>
        <p>
          Depois de checar essas possibilidades e ainda assim não encontrar nada — nem por nome, nem por CNPJ, nem
          variações razoáveis de grafia — aí sim vale um contato direto, documentado, com uma pergunta objetiva em
          vez de uma acusação. Na esmagadora maioria dos casos, a explicação é simples. Vale investigar antes de
          concluir.
        </p>
      </>
    ),
  },
  {
    slug: "atestado-retroativo",
    title: "Atestado retroativo: quando vale e quando é sinal de atenção",
    excerpt:
      "Data retroativa não é, por si só, motivo de recusa. Mas também não é algo pra ignorar. O equilíbrio está em entender o que costuma explicar a diferença de datas.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          O atestado chega com uma data de emissão anterior à data em que foi realmente entregue, às vezes anterior
          até ao início do período de afastamento que ele mesmo declara. É um dos gatilhos mais comuns de
          desconfiança no RH — e um dos que mais precisa de contexto antes de virar decisão.
        </p>
        <h2>O que costuma explicar isso</h2>
        <p>
          Consultas por telemedicina emitidas no mesmo dia do atendimento mas entregues depois; um colaborador que
          foi atendido mas só conseguiu levar o documento ao RH alguns dias depois; um sistema de emissão que registra
          a data do atendimento, não a da entrega. Nenhum desses cenários é incomum, e nenhum deles é sinal de má-fé.
        </p>
        <h2>Onde o alerta genuíno mora</h2>
        <p>
          O que pede atenção de verdade é uma discrepância grande e não explicada — um atestado &ldquo;emitido&rdquo;
          semanas antes de qualquer contato do colaborador com a empresa sobre uma ausência, sem nenhuma justificativa
          plausível. Diferença de um a poucos dias, quase sempre tem explicação simples. Diferença de semanas, sem
          contexto, merece pergunta.
        </p>
        <p>
          A régua certa não é &ldquo;toda data retroativa é suspeita&rdquo; nem o oposto — é perguntar se a
          diferença de datas tem uma explicação razoável antes de decidir que não tem.
        </p>
      </>
    ),
  },
  {
    slug: "confianca-que-se-constroi",
    title: "A confiança que se constrói (ou se perde) num processo de RH",
    excerpt:
      "Cada decisão sobre um atestado — aceitar, questionar, recusar — é também uma mensagem que a empresa manda pra todo mundo que está observando, não só pra quem apresentou o documento.",
    publishedAt: "2026-08-20",
    readingMinutes: 3,
    body: (
      <>
        <p>
          Toda decisão sobre um atestado acontece diante de uma plateia maior do que parece. Não é só entre o RH e
          quem apresentou o documento — é observada, direta ou indiretamente, por todo o resto do time, que aprende
          com cada caso o que esperar da empresa da próxima vez que precisar se ausentar.
        </p>
        <h2>O que um processo inconsistente ensina, sem querer</h2>
        <p>
          Quando a decisão muda de caso pra caso, sem critério visível — um atestado parecido aceito numa situação e
          questionado em outra — a lição que o time aprende não é sobre atestados. É sobre não poder confiar em como
          a empresa vai reagir. E isso corrói mais confiança do que qualquer rigor bem aplicado.
        </p>
        <h2>O que um processo consistente constrói</h2>
        <p>
          Um critério aplicado igual pra todo mundo, sempre, é desconfortável de configurar uma vez e depois se torna
          a coisa mais tranquilizadora que existe — tanto pra quem trabalha na empresa quanto para quem precisa,
          eventualmente, decidir sobre um caso difícil. Ninguém precisa adivinhar a régua, porque a régua é sempre a
          mesma.
        </p>
        <p>
          Verificação consistente não é sobre desconfiar mais. É sobre transformar cada decisão individual em parte
          de um processo maior — um processo que, com o tempo, é o que realmente sustenta a confiança dos dois
          lados.
        </p>
      </>
    ),
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return posts.find((p) => p.slug === slug);
}

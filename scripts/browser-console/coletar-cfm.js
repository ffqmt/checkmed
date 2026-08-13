/**
 * COMO USAR (cole isto no Console do DevTools do navegador — F12 > Console):
 *
 * 1. Abra https://portal.cfm.org.br/busca-medicos em uma aba.
 * 2. Selecione a UF desejada no formulário e clique em "Enviar" você mesma —
 *    é nessa etapa que o site pode pedir confirmação de segurança (reCAPTCHA);
 *    resolva normalmente, como qualquer visitante faria. Este script NUNCA
 *    tenta pular ou automatizar essa etapa — ele só entra em ação DEPOIS que
 *    a página de resultados já estiver na tela.
 * 3. Com os resultados na tela, cole este arquivo inteiro no Console e
 *    aperte Enter. Ele detecta a UF sozinho (lendo os próprios resultados),
 *    pagina automaticamente e baixa um .txt já nomeado corretamente
 *    (ex.: medicos_cfm_SP.txt) ao final — pronto para jogar em data/cfm-raw/.
 *
 * PARA VÁRIOS ESTADOS "AO MESMO TEMPO":
 * O site busca por POST/AJAX (não existe um link tipo ?uf=SP para abrir
 * direto na página de resultado de um estado), então não dá para abrir uma
 * URL por UF automaticamente — a busca em si (com a confirmação de segurança)
 * precisa ser feita por você, uma vez por aba. O jeito de paralelizar:
 *   a) Abra uma aba nova por UF (Ctrl/Cmd+clique no link, ou copie a URL).
 *   b) Em cada aba, faça a busca da UF correspondente (você resolve a
 *      confirmação de segurança dessa aba).
 *   c) Cole este mesmo script em cada aba depois que os resultados
 *      aparecerem. As abas são processos independentes do navegador — uma
 *      vez disparadas, elas paginam e baixam o arquivo de forma
 *      independente e simultânea, sem precisar de mais nada seu além de
 *      acompanhar (e resolver alguma nova confirmação de segurança, se
 *      pedir de novo no meio da paginação).
 * Evite disparar muitas abas de uma vez só — vá de poucas em poucas (3–4
 * por vez) para não parecer tráfego automatizado em massa.
 *
 * ESTADOS GRANDES (ex. SP): defina CHECKPOINT_A_CADA abaixo para baixar um
 * arquivo parcial periodicamente, assim uma aba travada/fechada por engano
 * não perde tudo. Cada checkpoint substitui o anterior como "mais recente" —
 * use o de maior número de página se precisar recuperar.
 */
(async function coletarDadosCFM() {
  const MAX_PAGINAS = 2000; // trava de segurança — nunca deveria chegar perto disso
  const CHECKPOINT_A_CADA = 0; // 0 = desativado. Ex.: 100 = baixa um checkpoint a cada 100 páginas.

  const todosDados = [];
  let paginaAtual = 1;
  let ultimoBlocoTexto = null;

  function seletorAtivo() {
    // ".busca-resultado" é o CONTÊINER da página inteira (innerText
    // concatena todos os médicos sem separador) — ".resultado-item" é a
    // linha real de cada médico no template do próprio site.
    return document.querySelectorAll(".resultado-item").length > 0 ? ".resultado-item" : ".busca-resultado";
  }

  function lerResultados() {
    return document.querySelectorAll(seletorAtivo());
  }

  function detectarUf() {
    const primeiroResultado = document.querySelector(".resultado-item, .busca-resultado");
    if (primeiroResultado) {
      const match = primeiroResultado.className.match(/medico_([A-Z]{2})_/);
      if (match) return match[1];
    }
    const select = document.querySelector('select[name="uf"]');
    if (select && select.value) return select.value;
    return "DESCONHECIDO";
  }

  function baixarArquivo(uf, dados, sufixo) {
    const conteudoTxt = dados.join("\n");
    const blob = new Blob([conteudoTxt], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `medicos_cfm_${uf}${sufixo}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Substitui a espera fixa de 3s: confere a cada 250ms (até 8s) se o
  // conteúdo já mudou, em vez de sempre esperar o teto — mais rápido quando
  // o site responde rápido, e ainda seguro quando demora.
  async function esperarAtualizar(textoAnterior, timeoutMs = 8000, intervaloMs = 250) {
    const inicio = Date.now();
    while (Date.now() - inicio < timeoutMs) {
      await new Promise((r) => setTimeout(r, intervaloMs));
      const atual = Array.from(lerResultados()).map((el) => el.innerText.trim()).join("\n");
      if (atual && atual !== textoAnterior) return true;
    }
    return false;
  }

  while (paginaAtual <= MAX_PAGINAS) {
    const resultados = lerResultados();

    if (resultados.length === 0) {
      console.log("Nenhum resultado encontrado nesta página — encerrando.");
      break;
    }

    const blocoAtual = Array.from(resultados).map((el) => el.innerText.trim()).join("\n");

    const crmCount = (blocoAtual.match(/CRM:\s*[\w-]+\s*\/\s*[A-Z]{2}/g) || []).length;
    if (crmCount > resultados.length * 1.5) {
      console.warn(
        `Encontrados ${resultados.length} elemento(s) mas ${crmCount} linhas de CRM — o seletor pode estar pegando mais de um médico por elemento. Os dados ainda são recuperáveis na importação, mas vale conferir o arquivo.`,
      );
    }

    if (blocoAtual === ultimoBlocoTexto) {
      console.warn("A página não mudou desde a última coleta — parando para evitar loop (o botão 'Próxima' pode não ter avançado de verdade, ou pode ter aparecido uma nova confirmação de segurança — dê uma olhada na aba).");
      break;
    }
    ultimoBlocoTexto = blocoAtual;

    resultados.forEach((el) => {
      todosDados.push(el.innerText.trim());
      todosDados.push("--------------------------------------------------\n");
    });

    console.log(`Página ${paginaAtual} coletada — total acumulado: ${todosDados.length / 2} médico(s).`);

    if (CHECKPOINT_A_CADA > 0 && paginaAtual % CHECKPOINT_A_CADA === 0) {
      baixarArquivo(detectarUf(), todosDados, `_checkpoint_pagina${paginaAtual}`);
      console.log(`Checkpoint salvo na página ${paginaAtual}.`);
    }

    const botaoProximo = Array.from(document.querySelectorAll("a, button")).find(
      (el) =>
        el.textContent.trim() === "Próxima" ||
        el.textContent.trim() === ">" ||
        el.textContent.trim() === (paginaAtual + 1).toString(),
    );

    if (botaoProximo && !botaoProximo.classList.contains("disabled") && botaoProximo.getAttribute("aria-disabled") !== "true") {
      paginaAtual++;
      botaoProximo.click();
      const mudou = await esperarAtualizar(blocoAtual);
      if (!mudou) {
        console.log("A página demorou mais que 8s para atualizar — seguindo mesmo assim (a checagem de duplicata cobre o caso de não ter avançado de verdade).");
      }
    } else {
      console.log("Última página alcançada.");
      break;
    }
  }

  const uf = detectarUf();
  baixarArquivo(uf, todosDados, "");

  console.log(`Download concluído: medicos_cfm_${uf}.txt (${paginaAtual} página(s), ${todosDados.length / 2} médico(s)).`);
  console.log("Mova (ou já deve ter caído) o arquivo baixado para a pasta data/cfm-raw/ do projeto.");
})();

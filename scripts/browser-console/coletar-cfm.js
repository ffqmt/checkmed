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
 */
(async function coletarDadosCFM() {
  const todosDados = [];
  let paginaAtual = 1;
  const MAX_PAGINAS = 500; // trava de segurança — nunca deveria chegar perto disso
  let ultimoBlocoTexto = null;

  function detectarUf() {
    // O próprio HTML de cada resultado carrega a UF na classe
    // (ex.: "resultado-item medico_SP_123456") — mais confiável do que ler
    // o <select>, que pode já ter sido resetado pela navegação.
    const primeiroResultado = document.querySelector(".busca-resultado, .resultado-item");
    if (primeiroResultado) {
      const match = primeiroResultado.className.match(/medico_([A-Z]{2})_/);
      if (match) return match[1];
    }
    const select = document.querySelector('select[name="uf"]');
    if (select && select.value) return select.value;
    return "DESCONHECIDO";
  }

  while (paginaAtual <= MAX_PAGINAS) {
    console.log(`Coletando dados da página ${paginaAtual}...`);

    // ".busca-resultado" turned out to be the whole results-page CONTAINER
    // (its innerText concatenates every doctor on the page with no
    // separator), not one element per doctor — the site's own result
    // template uses ".resultado-item" per row, which is what we actually
    // want. Falls back to the container only if the site's markup changes
    // again and ".resultado-item" stops existing.
    let resultados = document.querySelectorAll(".resultado-item");
    if (resultados.length === 0) resultados = document.querySelectorAll(".busca-resultado");

    if (resultados.length === 0) {
      console.log("Nenhum resultado encontrado nesta página.");
      break;
    }

    const blocoAtual = Array.from(resultados)
      .map((el) => el.innerText.trim())
      .join("\n");

    const crmCount = (blocoAtual.match(/CRM:\s*[\w-]+\s*\/\s*[A-Z]{2}/g) || []).length;
    if (crmCount > resultados.length * 1.5) {
      console.warn(
        `Encontrados ${resultados.length} elemento(s) mas ${crmCount} linhas de CRM — o seletor pode estar pegando mais de um médico por elemento. Os dados ainda são recuperáveis na importação, mas vale conferir o arquivo.`,
      );
    }

    if (blocoAtual === ultimoBlocoTexto) {
      console.warn("A página não mudou desde a última coleta — parando para evitar loop (o botão 'Próxima' pode não ter avançado de verdade).");
      break;
    }
    ultimoBlocoTexto = blocoAtual;

    resultados.forEach((el) => {
      todosDados.push(el.innerText.trim());
      todosDados.push("--------------------------------------------------\n");
    });

    const botaoProximo = Array.from(document.querySelectorAll("a, button")).find(
      (el) =>
        el.textContent.trim() === "Próxima" ||
        el.textContent.trim() === ">" ||
        el.textContent.trim() === (paginaAtual + 1).toString(),
    );

    if (botaoProximo && !botaoProximo.classList.contains("disabled") && botaoProximo.getAttribute("aria-disabled") !== "true") {
      paginaAtual++;
      botaoProximo.click();
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } else {
      console.log("Última página alcançada.");
      break;
    }
  }

  const uf = detectarUf();
  const conteudoTxt = todosDados.join("\n");
  const blob = new Blob([conteudoTxt], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `medicos_cfm_${uf}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  console.log(`Download concluído: medicos_cfm_${uf}.txt (${paginaAtual} página(s), ${todosDados.length / 2} médico(s)).`);
  console.log("Mova (ou já deve ter caído) o arquivo baixado para a pasta data/cfm-raw/ do projeto.");
})();

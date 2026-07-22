// Guarda o formulário e suas perguntas carregadas, pra não ficar buscando
// na API de novo toda hora (usadas por várias funções abaixo)
let formularioAtual = null;
let perguntasDoFormulario = [];

document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
    const idFormulario = obterIdDaUrl();

    if (!idFormulario) {
        exibirIndisponivel("Formulário não informado na URL.");
        return;
    }

    formularioAtual = await buscarPorId("formularios", idFormulario);

    if (!formularioAtual) {
        exibirIndisponivel("Formulário não encontrado.");
        return;
    }

    document.getElementById("tituloFormulario").textContent = formularioAtual.titulo;
    document.getElementById("descricaoFormulario").textContent = formularioAtual.descricao || "";

    // regra 3 do enunciado: só aceita resposta se status "publicado" e dentro da vigência
    const disponibilidade = formularioDisponivelParaResposta(formularioAtual);
    if (!disponibilidade.ok) {
        exibirIndisponivel(disponibilidade.motivo);
        return;
    }

    const todasPerguntas = await buscarRecursos("perguntas");
    // troca os ids salvos em formularioAtual.perguntas pelos objetos de pergunta completos
    perguntasDoFormulario = formularioAtual.perguntas
        .map((id) => todasPerguntas.find((pergunta) => pergunta.id === id))
        .filter(Boolean);

    renderizarPerguntas();
    configurarBarraDeProgresso();
    document.getElementById("formResposta").addEventListener("submit", enviarResposta);
}

// Pega o id do formulário a partir de "responder.html?id=1"
function obterIdDaUrl() {
    const parametros = new URLSearchParams(window.location.search);
    return parametros.get("id");
}

// Esconde o formulário e mostra uma mensagem no lugar do título, quando
// o formulário não existe ou não está disponível pra resposta no momento
function exibirIndisponivel(mensagem) {
    document.getElementById("tituloFormulario").textContent = "Indisponível";
    document.getElementById("descricaoFormulario").textContent = mensagem;
    document.getElementById("formResposta").classList.add("oculto");
    document.getElementById("barraProgressoWrap").classList.add("oculto");
}

// Verifica a regra 3: status precisa ser "publicado" e a data de hoje
// precisa estar dentro do intervalo dataInicio -> dataFim (quando informados)
function formularioDisponivelParaResposta(formulario) {
    if (formulario.status !== "publicado") {
        return { ok: false, motivo: "Este formulário não está disponível para respostas no momento." };
    }

    const agora = new Date();

    if (formulario.dataInicio && agora < new Date(formulario.dataInicio)) {
        return { ok: false, motivo: "Este formulário ainda não abriu para respostas." };
    }

    if (formulario.dataFim && agora > new Date(formulario.dataFim)) {
        return { ok: false, motivo: "Este formulário já está encerrado." };
    }

    return { ok: true };
}

// Cria na tela um bloco de pergunta pra cada pergunta do formulário
function renderizarPerguntas() {
    const container = document.getElementById("perguntasFormulario");
    container.innerHTML = "";

    perguntasDoFormulario.forEach((pergunta) => {
        const bloco = document.createElement("div");
        bloco.className = "pergunta-resposta";

        // "*" no rótulo indica visualmente que a pergunta é obrigatória
        const rotulo = pergunta.obrigatoria ? `${pergunta.enunciado} *` : pergunta.enunciado;
        bloco.innerHTML = `<label>${rotulo}</label>${campoParaTipo(pergunta)}`;

        container.appendChild(bloco);
    });
}

// Decide qual tipo de campo HTML mostrar, de acordo com o tipo da pergunta
// (seção 3 do enunciado: cada tipo tem uma forma diferente de ser respondido)
function campoParaTipo(pergunta) {
    if (pergunta.tipo === "multipla_escolha") {
        // radio: só permite escolher UMA alternativa
        return pergunta.alternativas.map((alternativa) => `
            <label class="opcao-resposta">
                <input type="radio" name="pergunta-${pergunta.id}" value="${alternativa}">
                ${alternativa}
            </label>
        `).join("");
    }

    if (pergunta.tipo === "checkbox") {
        // checkbox: permite escolher VÁRIAS alternativas
        return pergunta.alternativas.map((alternativa) => `
            <label class="opcao-resposta">
                <input type="checkbox" name="pergunta-${pergunta.id}" value="${alternativa}">
                ${alternativa}
            </label>
        `).join("");
    }

    if (pergunta.tipo === "texto_curto") {
        return `<input type="text" name="pergunta-${pergunta.id}" maxlength="200">`;
    }

    // texto_longo: sem limite de caracteres, por isso é uma textarea
    return `<textarea name="pergunta-${pergunta.id}"></textarea>`;
}

// Liga a barra de progresso: mostra ela e recalcula a cada digitação/clique
// dentro das perguntas, sem precisar apertar nenhum botão pra atualizar
function configurarBarraDeProgresso() {
    document.getElementById("barraProgressoWrap").classList.remove("oculto");

    const container = document.getElementById("perguntasFormulario");
    container.addEventListener("input", atualizarProgresso);
    container.addEventListener("change", atualizarProgresso);

    atualizarProgresso();
}

// Calcula quantas perguntas OBRIGATÓRIAS já têm resposta e atualiza a barra
function atualizarProgresso() {
    const obrigatorias = perguntasDoFormulario.filter((pergunta) => pergunta.obrigatoria);
    const texto = document.getElementById("progressoTexto");
    const preenchida = document.getElementById("progressoFill");

    if (obrigatorias.length === 0) {
        texto.textContent = "Este formulário não tem perguntas obrigatórias.";
        preenchida.style.width = "100%";
        return;
    }

    const respondidas = obrigatorias.filter(
        (pergunta) => lerRespostaDaPergunta(pergunta) !== null
    );
    const percentual = Math.round((respondidas.length / obrigatorias.length) * 100);

    texto.textContent = `${respondidas.length} de ${obrigatorias.length} perguntas obrigatórias respondidas`;
    preenchida.style.width = `${percentual}%`;
}

// Lê o valor respondido pra uma pergunta específica, olhando pro tipo dela.
// Retorna null quando a pergunta ficou sem resposta.
function lerRespostaDaPergunta(pergunta) {
    if (pergunta.tipo === "multipla_escolha") {
        const selecionado = document.querySelector(`input[name="pergunta-${pergunta.id}"]:checked`);
        return selecionado ? selecionado.value : null;
    }

    if (pergunta.tipo === "checkbox") {
        const selecionados = Array.from(
            document.querySelectorAll(`input[name="pergunta-${pergunta.id}"]:checked`)
        );
        return selecionados.length > 0 ? selecionados.map((checkbox) => checkbox.value) : null;
    }

    const campo = document.querySelector(`[name="pergunta-${pergunta.id}"]`);
    const valor = campo.value.trim();
    return valor !== "" ? valor : null;
}

// Consulta as respostas já registradas e verifica se esse e-mail já
// respondeu esse formulário (regra 4 do enunciado). Comparação é
// case-insensitive e ignora espaços nas pontas, como pede o enunciado.
async function jaRespondeuEsteFormulario(formularioId, email) {
    const respostas = await buscarRecursos("respostas");
    const emailNormalizado = email.trim().toLowerCase();

    return respostas.some((resposta) =>
        resposta.formularioId === formularioId &&
        resposta.email.trim().toLowerCase() === emailNormalizado
    );
}

// Confere se o valor enviado respeita o formato esperado pelo tipo da pergunta
// (seção 3/5 do enunciado). Mesmo a tela só deixando marcar opções válidas,
// validamos de novo aqui — nunca confiar só no que o HTML/DOM "deixaria" enviar.
function valorRespeitaTipo(pergunta, valor) {
    if (pergunta.tipo === "multipla_escolha") {
        return typeof valor === "string" && pergunta.alternativas.includes(valor);
    }

    if (pergunta.tipo === "checkbox") {
        if (!Array.isArray(valor) || valor.length === 0) {
            return false;
        }
        const semDuplicadas = new Set(valor);
        return semDuplicadas.size === valor.length &&
            valor.every((item) => pergunta.alternativas.includes(item));
    }

    if (pergunta.tipo === "texto_curto") {
        return typeof valor === "string" && valor.length <= 200;
    }

    return typeof valor === "string"; // texto_longo: qualquer string, sem limite
}

// Todas as validações da seção 5 do enunciado, na hora de responder
async function validarResposta(nome, email, respostas) {
    if (nome.length < 2) {
        return "O nome precisa ter pelo menos 2 caracteres.";
    }

    const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regexEmail.test(email)) {
        return "Informe um e-mail em formato válido.";
    }

    if (await jaRespondeuEsteFormulario(formularioAtual.id, email)) {
        return "Este e-mail já respondeu este formulário.";
    }

    // verifica se cada resposta enviada tem o formato esperado pelo tipo da pergunta
    for (const item of respostas) {
        const pergunta = perguntasDoFormulario.find((p) => p.id === item.perguntaId);
        if (!valorRespeitaTipo(pergunta, item.valor)) {
            return `Resposta inválida para a pergunta "${pergunta.enunciado}".`;
        }
    }

    // verifica se sobrou alguma pergunta obrigatória sem resposta
    const faltando = perguntasDoFormulario
        .filter((pergunta) => pergunta.obrigatoria)
        .filter((pergunta) => !respostas.some((item) => item.perguntaId === pergunta.id))
        .map((pergunta) => pergunta.enunciado);

    if (faltando.length > 0) {
        return `Responda as perguntas obrigatórias: ${faltando.join(", ")}`;
    }

    return "";
}

async function enviarResposta(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página

    const erro = document.getElementById("erroResposta");
    const sucesso = document.getElementById("sucessoResposta");
    erro.textContent = "";
    sucesso.textContent = "";

    const nome = document.getElementById("nome").value.trim();
    const email = document.getElementById("email").value.trim();

    // monta uma entrada { perguntaId, valor } pra cada pergunta que foi respondida,
    // descartando as que ficaram sem valor (perguntas não obrigatórias podem ficar em branco)
    const respostas = perguntasDoFormulario
        .map((pergunta) => ({ perguntaId: pergunta.id, valor: lerRespostaDaPergunta(pergunta) }))
        .filter((item) => item.valor !== null);

    const mensagemErro = await validarResposta(nome, email, respostas);
    if (mensagemErro) {
        erro.textContent = mensagemErro;
        return; // não envia pra API se alguma validação falhar
    }

    await criar("respostas", {
        formularioId: formularioAtual.id,
        nome,
        email,
        respostas,
        enviadoEm: new Date().toISOString()
    });

    document.getElementById("formResposta").reset();
    document.getElementById("formResposta").classList.add("oculto"); // impede reenvio duplicado

    Swal.fire({
        icon: "success",
        title: "Resposta enviada!",
        text: "Obrigado por responder este formulário.",
        confirmButtonColor: "#1f8bef"
    });
}

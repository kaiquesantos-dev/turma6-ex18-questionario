document.addEventListener("DOMContentLoaded", () => {
    carregarPerguntas();
    document.getElementById("tipo").addEventListener("change", atualizarBlocoAlternativas);
    document.getElementById("btnAddAlternativa").addEventListener("click", adicionarCampoAlternativa);
    document.getElementById("formPergunta").addEventListener("submit", salvarPergunta);
    document.getElementById("btnCancelarEdicao").addEventListener("click", cancelarEdicao);
});

async function carregarPerguntas() {
    const perguntas = await buscarRecursos("perguntas");
    const corpo = document.getElementById("corpoTabelaPerguntas");
    corpo.innerHTML = "";

    perguntas.forEach((pergunta) => {
        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${pergunta.enunciado}</td>
            <td>${pergunta.tipo}</td>
            <td>${pergunta.obrigatoria ? "Sim" : "Não"}</td>
            <td>${pergunta.alternativas.join(", ")}</td>
            <td>
                <button type="button" class="secundario" data-acao="editar" data-id="${pergunta.id}">Editar</button>
                <button type="button" class="perigo" data-acao="excluir" data-id="${pergunta.id}">Excluir</button>
            </td>
        `;
        corpo.appendChild(linha);
    });

    corpo.querySelectorAll("button[data-acao='editar']").forEach((botao) => {
        botao.addEventListener("click", () => editarPergunta(botao.dataset.id));
    });
    corpo.querySelectorAll("button[data-acao='excluir']").forEach((botao) => {
        botao.addEventListener("click", () => excluirPergunta(botao.dataset.id));
    });
}

function tipoTemAlternativas(tipo) {
    return tipo === "multipla_escolha" || tipo === "checkbox";
}

function atualizarBlocoAlternativas() {
    const tipo = document.getElementById("tipo").value;
    const bloco = document.getElementById("blocoAlternativas");

    if (tipoTemAlternativas(tipo)) {
        bloco.classList.remove("oculto");
    } else {
        bloco.classList.add("oculto");
        document.getElementById("listaAlternativas").innerHTML = "";
    }
}

function adicionarCampoAlternativa(valor = "") {
    const lista = document.getElementById("listaAlternativas");
    const linha = document.createElement("div");
    linha.className = "linha-alternativa";
    linha.innerHTML = `
        <input type="text" class="campo-alternativa" value="${valor}">
        <button type="button" class="secundario btn-remover-alternativa">Remover</button>
    `;
    linha.querySelector(".btn-remover-alternativa").addEventListener("click", () => linha.remove());
    lista.appendChild(linha);
}

function lerAlternativasDoFormulario() {
    return Array.from(document.querySelectorAll(".campo-alternativa"))
        .map((campo) => campo.value.trim())
        .filter((valor) => valor !== "");
}

function validarPergunta(pergunta) {
    if (!pergunta.enunciado) {
        return "O enunciado não pode ser vazio.";
    }

    const tiposValidos = ["multipla_escolha", "checkbox", "texto_curto", "texto_longo"];
    if (!tiposValidos.includes(pergunta.tipo)) {
        return "Selecione um tipo de pergunta válido.";
    }

    if (tipoTemAlternativas(pergunta.tipo)) {
        const alternativas = pergunta.alternativas;
        const semDuplicadas = new Set(alternativas.map((a) => a.toLowerCase()));

        if (semDuplicadas.size !== alternativas.length) {
            return "As alternativas não podem se repetir.";
        }

        if (pergunta.tipo === "multipla_escolha" && (alternativas.length < 2 || alternativas.length > 10)) {
            return "Múltipla escolha precisa ter entre 2 e 10 alternativas.";
        }

        if (pergunta.tipo === "checkbox" && (alternativas.length < 3 || alternativas.length > 15)) {
            return "Checkbox precisa ter entre 3 e 15 alternativas.";
        }
    }

    return "";
}

async function salvarPergunta(evento) {
    evento.preventDefault();
    const erro = document.getElementById("erroPergunta");
    erro.textContent = "";

    const pergunta = {
        enunciado: document.getElementById("enunciado").value.trim(),
        tipo: document.getElementById("tipo").value,
        obrigatoria: document.getElementById("obrigatoria").checked,
        alternativas: tipoTemAlternativas(document.getElementById("tipo").value)
            ? lerAlternativasDoFormulario()
            : []
    };

    const mensagemErro = validarPergunta(pergunta);
    if (mensagemErro) {
        erro.textContent = mensagemErro;
        return;
    }

    const id = document.getElementById("perguntaId").value;

    if (id) {
        await atualizar("perguntas", id, pergunta);
    } else {
        pergunta.criadaEm = new Date().toISOString();
        await criar("perguntas", pergunta);
    }

    cancelarEdicao();
    carregarPerguntas();
}

async function editarPergunta(id) {
    const pergunta = await buscarPorId("perguntas", id);

    document.getElementById("tituloFormPergunta").textContent = "Editar pergunta";
    document.getElementById("perguntaId").value = pergunta.id;
    document.getElementById("enunciado").value = pergunta.enunciado;
    document.getElementById("tipo").value = pergunta.tipo;
    document.getElementById("obrigatoria").checked = pergunta.obrigatoria;

    atualizarBlocoAlternativas();
    document.getElementById("listaAlternativas").innerHTML = "";
    pergunta.alternativas.forEach((alternativa) => adicionarCampoAlternativa(alternativa));

    document.getElementById("btnCancelarEdicao").classList.remove("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function cancelarEdicao() {
    document.getElementById("formPergunta").reset();
    document.getElementById("perguntaId").value = "";
    document.getElementById("tituloFormPergunta").textContent = "Nova pergunta";
    document.getElementById("listaAlternativas").innerHTML = "";
    document.getElementById("blocoAlternativas").classList.add("oculto");
    document.getElementById("btnCancelarEdicao").classList.add("oculto");
    document.getElementById("erroPergunta").textContent = "";
}

async function perguntaPossuiRespostas(id) {
    const respostas = await buscarRecursos("respostas");
    return respostas.some((resposta) =>
        resposta.respostas.some((item) => item.perguntaId === id)
    );
}

async function excluirPergunta(id) {
    if (await perguntaPossuiRespostas(id)) {
        alert("Essa pergunta já possui respostas registradas e não pode ser excluída.");
        return;
    }

    if (!confirm("Tem certeza que deseja excluir esta pergunta?")) {
        return;
    }

    await remover("perguntas", id);
    carregarPerguntas();
}

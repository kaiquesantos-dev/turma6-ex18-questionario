// Quando a página carrega: lista as perguntas e liga os eventos do formulário
document.addEventListener("DOMContentLoaded", () => {
    carregarPerguntas();
    document.getElementById("tipo").addEventListener("change", atualizarBlocoAlternativas);
    document.getElementById("btnAddAlternativa").addEventListener("click", adicionarCampoAlternativa);
    document.getElementById("formPergunta").addEventListener("submit", salvarPergunta);
    document.getElementById("btnCancelarEdicao").addEventListener("click", cancelarEdicao);
});

// Busca as perguntas na API e monta uma linha de tabela pra cada uma
async function carregarPerguntas() {
    const perguntas = await buscarRecursos("perguntas");
    const corpo = document.getElementById("corpoTabelaPerguntas");
    corpo.innerHTML = ""; // limpa a tabela antes de preencher, senão duplica

    if (perguntas.length === 0) {
        corpo.innerHTML = `<tr><td colspan="5" class="vazio">Nenhuma pergunta cadastrada ainda.</td></tr>`;
        return;
    }

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

    // liga os cliques de Editar/Excluir só depois que os botões existem no DOM
    corpo.querySelectorAll("button[data-acao='editar']").forEach((botao) => {
        botao.addEventListener("click", () => editarPergunta(botao.dataset.id));
    });
    corpo.querySelectorAll("button[data-acao='excluir']").forEach((botao) => {
        botao.addEventListener("click", () => excluirPergunta(botao.dataset.id));
    });
}

// Só múltipla_escolha e checkbox usam alternativas (seção 3 do enunciado)
function tipoTemAlternativas(tipo) {
    return tipo === "multipla_escolha" || tipo === "checkbox";
}

// Mostra/esconde o bloco de alternativas dependendo do tipo escolhido no select
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

// Adiciona um campo de texto novo pra digitar mais uma alternativa,
// com um botão pra remover essa linha caso o usuário desista dela
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

// Lê todos os campos de alternativa preenchidos, ignorando os vazios
function lerAlternativasDoFormulario() {
    return Array.from(document.querySelectorAll(".campo-alternativa"))
        .map((campo) => campo.value.trim())
        .filter((valor) => valor !== "");
}

// Validações da seção 3 e 5 do enunciado, ao cadastrar/editar uma pergunta
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
        // Set remove duplicadas: se o tamanho diminuir, é porque tinha repetida
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

    return ""; // string vazia = sem erro
}

// Lida com o envio do formulário: monta o objeto, valida, e cria ou atualiza
async function salvarPergunta(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página
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
        return; // não chama a API se a validação falhar
    }

    // campo escondido "perguntaId" preenchido = edição (PUT); vazio = criação (POST)
    const id = document.getElementById("perguntaId").value;

    if (id) {
        // regra 8 do enunciado: valida de verdade (não só desabilitando o campo na tela)
        // que tipo/alternativas não mudaram numa pergunta que já foi respondida
        const original = await buscarPorId("perguntas", id);
        const possuiRespostas = await perguntaPossuiRespostas(id);
        const mudouTipoOuAlternativas =
            original.tipo !== pergunta.tipo ||
            JSON.stringify(original.alternativas) !== JSON.stringify(pergunta.alternativas);

        if (possuiRespostas && mudouTipoOuAlternativas) {
            erro.textContent = "Esta pergunta já foi respondida: não é possível alterar o tipo ou as alternativas. Cadastre uma nova pergunta em vez disso.";
            return;
        }

        await atualizar("perguntas", id, pergunta);
    } else {
        pergunta.criadaEm = new Date().toISOString();
        await criar("perguntas", pergunta);
    }

    cancelarEdicao();
    carregarPerguntas();
}

// Preenche o formulário com os dados de uma pergunta existente, pra edição
async function editarPergunta(id) {
    const pergunta = await buscarPorId("perguntas", id);
    const possuiRespostas = await perguntaPossuiRespostas(id);

    document.getElementById("tituloFormPergunta").textContent = "Editar pergunta";
    document.getElementById("perguntaId").value = pergunta.id;
    document.getElementById("enunciado").value = pergunta.enunciado;
    document.getElementById("tipo").value = pergunta.tipo;
    document.getElementById("obrigatoria").checked = pergunta.obrigatoria;

    atualizarBlocoAlternativas();
    document.getElementById("listaAlternativas").innerHTML = "";
    pergunta.alternativas.forEach((alternativa) => adicionarCampoAlternativa(alternativa));

    // regra 8 do enunciado: se a pergunta já foi respondida em algum formulário,
    // não pode mudar o tipo nem as alternativas (invalidaria as respostas antigas)
    document.getElementById("tipo").disabled = possuiRespostas;
    document.getElementById("btnAddAlternativa").disabled = possuiRespostas;
    document.querySelectorAll(".campo-alternativa, .btn-remover-alternativa").forEach((elemento) => {
        elemento.disabled = possuiRespostas;
    });

    document.getElementById("btnCancelarEdicao").classList.remove("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" }); // sobe a página pro usuário ver o form
}

// Limpa o formulário e volta ao modo "nova pergunta"
function cancelarEdicao() {
    document.getElementById("formPergunta").reset();
    document.getElementById("perguntaId").value = "";
    document.getElementById("tituloFormPergunta").textContent = "Nova pergunta";
    document.getElementById("listaAlternativas").innerHTML = "";
    document.getElementById("blocoAlternativas").classList.add("oculto");
    document.getElementById("btnCancelarEdicao").classList.add("oculto");
    document.getElementById("erroPergunta").textContent = "";
    document.getElementById("tipo").disabled = false;
    document.getElementById("btnAddAlternativa").disabled = false;
}

// Verifica se essa pergunta já foi respondida em algum formulário
// (procura o id dela dentro do array "respostas" de cada registro em respostas)
async function perguntaPossuiRespostas(id) {
    const respostas = await buscarRecursos("respostas");
    return respostas.some((resposta) =>
        resposta.respostas.some((item) => item.perguntaId === id)
    );
}

// Exclui a pergunta, respeitando a regra 7 do enunciado:
// não pode excluir fisicamente se já existem respostas vinculadas
async function excluirPergunta(id) {
    if (await perguntaPossuiRespostas(id)) {
        await Swal.fire({
            icon: "error",
            title: "Não é possível excluir",
            text: "Essa pergunta já possui respostas registradas e não pode ser excluída.",
            confirmButtonColor: "#1f8bef"
        });
        return;
    }

    const confirmacao = await Swal.fire({
        icon: "warning",
        title: "Excluir pergunta?",
        text: "Essa ação não pode ser desfeita.",
        showCancelButton: true,
        confirmButtonText: "Sim, excluir",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#e0473f",
        cancelButtonColor: "#8b98a9"
    });

    if (!confirmacao.isConfirmed) {
        return;
    }

    await remover("perguntas", id);
    carregarPerguntas();

    Swal.fire({
        icon: "success",
        title: "Pergunta excluída",
        confirmButtonColor: "#1f8bef",
        timer: 1500,
        showConfirmButton: false
    });
}

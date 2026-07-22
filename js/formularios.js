// Quando a página termina de carregar, prepara tudo:
document.addEventListener("DOMContentLoaded", () => {
    carregarFormularios();          // lista os formulários já cadastrados na tabela
    carregarPerguntasDisponiveis(); // monta os checkboxes com as perguntas existentes
    document.getElementById("formFormulario").addEventListener("submit", salvarFormulario);
    document.getElementById("btnCancelarEdicaoFormulario").addEventListener("click", cancelarEdicaoFormulario);
});

// O <input type="date"> trabalha com "AAAA-MM-DD".
// Essa função pega uma data ISO completa (ex: "2026-07-01T00:00:00.000Z")
// e devolve só a parte "2026-07-01" pra exibir no input.
function formatarDataParaInput(isoString) {
    return isoString ? isoString.slice(0, 10) : "";
}

// Faz o caminho contrário: pega o valor "2026-07-01" digitado no input
// e transforma numa data ISO completa, formato usado no db.json.
function formatarDataParaIso(valorInput) {
    return valorInput ? new Date(valorInput).toISOString() : "";
}

// Busca todas as perguntas cadastradas e cria um checkbox pra cada uma,
// pra que o usuário escolha quais perguntas vão compor o formulário.
async function carregarPerguntasDisponiveis() {
    const perguntas = await buscarRecursos("perguntas");
    const lista = document.getElementById("listaPerguntasDisponiveis");
    lista.innerHTML = ""; // limpa antes de preencher, senão duplica a cada chamada

    perguntas.forEach((pergunta) => {
        const label = document.createElement("label");
        label.innerHTML = `
            <input type="checkbox" class="checkbox-pergunta" value="${pergunta.id}">
            ${pergunta.enunciado} (${pergunta.tipo})
        `;
        lista.appendChild(label);
    });
}

// Busca os formulários e as perguntas ao mesmo tempo (Promise.all),
// porque pra mostrar o enunciado das perguntas de cada formulário na tabela
// preciso cruzar os ids salvos em formulario.perguntas com a lista de perguntas.
async function carregarFormularios() {
    const [formularios, perguntas] = await Promise.all([
        buscarRecursos("formularios"),
        buscarRecursos("perguntas")
    ]);

    const corpo = document.getElementById("corpoTabelaFormularios");
    corpo.innerHTML = "";

    formularios.forEach((formulario) => {
        // troca os ids de pergunta (["1","2"]) pelos enunciados de texto, pra exibição
        const enunciados = formulario.perguntas
            .map((id) => perguntas.find((pergunta) => pergunta.id === id)?.enunciado)
            .filter(Boolean) // remove ids que não encontraram pergunta correspondente
            .join(", ");

        const vigencia = formulario.dataInicio && formulario.dataFim
            ? `${formatarDataParaInput(formulario.dataInicio)} até ${formatarDataParaInput(formulario.dataFim)}`
            : "sem prazo definido";

        const linha = document.createElement("tr");
        linha.innerHTML = `
            <td>${formulario.titulo}</td>
            <td><span class="badge badge-${formulario.status}">${formulario.status}</span></td>
            <td>${enunciados}</td>
            <td>${vigencia}</td>
            <td>
                <a href="responder.html?id=${formulario.id}">Responder</a> |
                <a href="respostas.html?formularioId=${formulario.id}">Respostas</a><br>
                <button type="button" class="secundario" data-acao="editar" data-id="${formulario.id}">Editar</button>
                <button type="button" class="perigo" data-acao="excluir" data-id="${formulario.id}">Excluir</button>
            </td>
        `;
        corpo.appendChild(linha);
    });

    // liga os cliques de Editar/Excluir depois que os botões já existem no DOM
    corpo.querySelectorAll("button[data-acao='editar']").forEach((botao) => {
        botao.addEventListener("click", () => editarFormulario(botao.dataset.id));
    });
    corpo.querySelectorAll("button[data-acao='excluir']").forEach((botao) => {
        botao.addEventListener("click", () => excluirFormulario(botao.dataset.id));
    });
}

// Retorna só os ids das perguntas cujo checkbox está marcado
function lerPerguntasSelecionadas() {
    return Array.from(document.querySelectorAll(".checkbox-pergunta:checked"))
        .map((checkbox) => checkbox.value);
}

// Regras de validação da seção 5 do enunciado (ao montar formulário)
function validarFormulario(formulario) {
    if (!formulario.titulo) {
        return "O título é obrigatório.";
    }

    if (formulario.perguntas.length === 0) {
        return "Selecione ao menos 1 pergunta.";
    }

    return "";
}

// Lida com o envio do formulário: cria um novo, ou atualiza se já existe um id
async function salvarFormulario(evento) {
    evento.preventDefault(); // impede o navegador de recarregar a página
    const erro = document.getElementById("erroFormulario");
    erro.textContent = "";

    const formulario = {
        titulo: document.getElementById("titulo").value.trim(),
        descricao: document.getElementById("descricao").value.trim(),
        status: document.getElementById("status").value,
        dataInicio: formatarDataParaIso(document.getElementById("dataInicio").value),
        dataFim: formatarDataParaIso(document.getElementById("dataFim").value),
        perguntas: lerPerguntasSelecionadas()
    };

    const mensagemErro = validarFormulario(formulario);
    if (mensagemErro) {
        erro.textContent = mensagemErro;
        return; // para aqui, não chama a API se a validação falhar
    }

    // se o campo escondido "formularioId" tiver valor, estamos editando (PUT)
    // se estiver vazio, estamos criando um novo (POST)
    const id = document.getElementById("formularioId").value;

    if (id) {
        await atualizar("formularios", id, formulario);
    } else {
        formulario.criadoEm = new Date().toISOString();
        await criar("formularios", formulario);
    }

    cancelarEdicaoFormulario(); // limpa o formulário
    carregarFormularios();      // atualiza a tabela com os dados novos
}

// Preenche o formulário com os dados de um formulário existente, pra edição
async function editarFormulario(id) {
    const formulario = await buscarPorId("formularios", id);
    const possuiRespostas = await formularioPossuiRespostas(id);

    document.getElementById("tituloFormFormulario").textContent = "Editar formulário";
    document.getElementById("formularioId").value = formulario.id;
    document.getElementById("titulo").value = formulario.titulo;
    document.getElementById("descricao").value = formulario.descricao || "";
    document.getElementById("status").value = formulario.status;
    document.getElementById("dataInicio").value = formatarDataParaInput(formulario.dataInicio);
    document.getElementById("dataFim").value = formatarDataParaInput(formulario.dataFim);

    // marca os checkboxes das perguntas que já pertencem a esse formulário
    document.querySelectorAll(".checkbox-pergunta").forEach((checkbox) => {
        checkbox.checked = formulario.perguntas.includes(checkbox.value);
        // regra 9 do enunciado: se já existem respostas, não pode mudar quais
        // perguntas compõem o formulário (senão invalidaria respostas antigas)
        checkbox.disabled = possuiRespostas;
    });

    document.getElementById("btnCancelarEdicaoFormulario").classList.remove("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" }); // sobe a página pro usuário ver o form
}

// Limpa o formulário e volta ao modo "criar novo"
function cancelarEdicaoFormulario() {
    document.getElementById("formFormulario").reset();
    document.getElementById("formularioId").value = "";
    document.getElementById("tituloFormFormulario").textContent = "Novo formulário";
    document.getElementById("btnCancelarEdicaoFormulario").classList.add("oculto");
    document.getElementById("erroFormulario").textContent = "";
    document.querySelectorAll(".checkbox-pergunta").forEach((checkbox) => {
        checkbox.disabled = false; // reabilita os checkboxes pro próximo cadastro
    });
}

// Verifica se algum registro em "respostas" pertence a esse formulário
async function formularioPossuiRespostas(id) {
    const respostas = await buscarRecursos("respostas");
    return respostas.some((resposta) => resposta.formularioId === id);
}

// Exclui o formulário, respeitando a regra 7 do enunciado:
// não pode excluir fisicamente se já existem respostas vinculadas
async function excluirFormulario(id) {
    if (await formularioPossuiRespostas(id)) {
        alert("Esse formulário já possui respostas registradas e não pode ser excluído. Altere o status para \"encerrado\" em vez disso.");
        return;
    }

    if (!confirm("Tem certeza que deseja excluir este formulário?")) {
        return;
    }

    await remover("formularios", id);
    carregarFormularios();
}

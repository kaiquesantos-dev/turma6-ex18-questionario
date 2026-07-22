document.addEventListener("DOMContentLoaded", iniciar);

async function iniciar() {
    // se veio de um link tipo "respostas.html?formularioId=1", já abre selecionado
    const idDaUrl = new URLSearchParams(window.location.search).get("formularioId");

    await carregarSeletorFormularios(idDaUrl || "");

    if (idDaUrl) {
        carregarRespostas(idDaUrl);
    }
}

// Monta um card clicável pra cada formulário, com status e quantidade de respostas
async function carregarSeletorFormularios(idSelecionado) {
    const [formularios, todasRespostas] = await Promise.all([
        buscarRecursos("formularios"),
        buscarRecursos("respostas")
    ]);

    const container = document.getElementById("seletorFormulario");
    container.innerHTML = "";

    if (formularios.length === 0) {
        container.innerHTML = `<p class="vazio">Nenhum formulário cadastrado ainda.</p>`;
        return;
    }

    formularios.forEach((formulario) => {
        const totalRespostas = todasRespostas.filter(
            (resposta) => resposta.formularioId === formulario.id
        ).length;

        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip-formulario" + (formulario.id === idSelecionado ? " selecionado" : "");
        chip.dataset.id = formulario.id;
        chip.innerHTML = `
            <strong>${formulario.titulo}</strong>
            <span class="badge badge-${formulario.status}">${formulario.status}</span>
            <span class="contagem">${totalRespostas} resposta${totalRespostas === 1 ? "" : "s"}</span>
        `;
        chip.addEventListener("click", () => selecionarFormulario(formulario.id));
        container.appendChild(chip);
    });
}

// Marca visualmente o card clicado como selecionado e carrega as respostas dele
function selecionarFormulario(id) {
    document.querySelectorAll(".chip-formulario").forEach((chip) => {
        chip.classList.toggle("selecionado", chip.dataset.id === id);
    });

    carregarRespostas(id);
}

// Formata a data ISO de envio pra algo legível (ex: 22/07/2026 14:32)
function formatarDataHora(isoString) {
    return new Date(isoString).toLocaleString("pt-BR");
}

// Um "valor" de resposta pode ser string (texto/múltipla escolha) ou
// array de strings (checkbox) — aqui juntamos os dois casos num só texto
function formatarValorResposta(valor) {
    return Array.isArray(valor) ? valor.join(", ") : valor;
}

async function carregarRespostas(formularioId) {
    const container = document.getElementById("listaRespostas");

    if (!formularioId) {
        container.innerHTML = "";
        return;
    }

    // busca as respostas e as perguntas ao mesmo tempo, porque precisamos
    // trocar cada perguntaId pelo enunciado correspondente na exibição
    const [todasRespostas, formulario, todasPerguntas] = await Promise.all([
        buscarRecursos("respostas"),
        buscarPorId("formularios", formularioId),
        buscarRecursos("perguntas")
    ]);

    const perguntasDoFormulario = formulario.perguntas
        .map((id) => todasPerguntas.find((pergunta) => pergunta.id === id))
        .filter(Boolean);

    const respostasDoFormulario = todasRespostas.filter(
        (resposta) => resposta.formularioId === formularioId
    );

    if (respostasDoFormulario.length === 0) {
        container.innerHTML = "<p class=\"vazio\">Nenhuma resposta recebida ainda para este formulário.</p>";
        return;
    }

    container.innerHTML = respostasDoFormulario.map((resposta) => `
        <div class="painel-resposta">
            <p><strong>${resposta.nome}</strong> — ${resposta.email}</p>
            <p class="data-envio">Enviado em ${formatarDataHora(resposta.enviadoEm)}</p>
            <ul>
                ${perguntasDoFormulario.map((pergunta) => {
                    const item = resposta.respostas.find((r) => r.perguntaId === pergunta.id);
                    const valor = item ? formatarValorResposta(item.valor) : "(sem resposta)";
                    return `<li><strong>${pergunta.enunciado}:</strong> ${valor}</li>`;
                }).join("")}
            </ul>
        </div>
    `).join("");
}

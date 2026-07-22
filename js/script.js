let perguntas = [];
let indiceAtual = 0;
let acertos = 0;

const elemPergunta = document.getElementById("pergunta");
const elemOpcoes = document.getElementById("opcoes");
const elemResultado = document.getElementById("resultado");

async function carregarPerguntas() {
  const resposta = await fetch("json/perguntas.json");
  perguntas = await resposta.json();
  mostrarPergunta();
}

function mostrarPergunta() {
  if (indiceAtual >= perguntas.length) {
    mostrarResultado();
    return;
  }

  const atual = perguntas[indiceAtual];
  elemPergunta.textContent = atual.pergunta;
  elemOpcoes.innerHTML = "";

  atual.opcoes.forEach((opcao, indice) => {
    const botao = document.createElement("button");
    botao.textContent = opcao;
    botao.addEventListener("click", () => responder(indice));
    elemOpcoes.appendChild(botao);
  });
}

function responder(indiceEscolhido) {
  if (indiceEscolhido === perguntas[indiceAtual].resposta) {
    acertos++;
  }
  indiceAtual++;
  mostrarPergunta();
}

function mostrarResultado() {
  elemPergunta.textContent = "Questionário finalizado!";
  elemOpcoes.innerHTML = "";
  elemResultado.textContent = `Você acertou ${acertos} de ${perguntas.length} perguntas.`;
}

carregarPerguntas();

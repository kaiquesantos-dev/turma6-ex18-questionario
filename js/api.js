// Endereço onde o json-server está rodando (npm run server sobe na porta 3000)
const API_URL = "http://localhost:3000"

// Busca TODOS os itens de um recurso (ex: buscarRecursos("perguntas"))
// GET http://localhost:3000/perguntas
async function buscarRecursos(recurso) {
    const resposta = await fetch (`${API_URL}/${recurso}`);
    return resposta.json() // converte o corpo da resposta em array/objeto JS

}

// Busca UM item específico pelo id (ex: buscarPorId("perguntas", "1"))
// GET http://localhost:3000/perguntas/1
async function buscarPorId(recurso, id ){
    const resposta = await fetch(`${API_URL}/${recurso}/${id}`);
    return resposta.json()
}

// Cria um novo item (POST). "dados" é o objeto JS que vai virar o novo registro.
async function criar (recurso, dados ) {
    const reposta = await fetch(`${API_URL}/${recurso}`,{
        method: "POST",
        headers: {"Content-Type":"application/json"}, // avisa que o body é JSON
        body: JSON.stringify(dados) // transforma o objeto JS em texto JSON
    })
    return reposta.json() // devolve o item criado (já com o id gerado pelo json-server)
}

// Atualiza um item existente por completo (PUT). Precisa do id de quem editar.
async function atualizar (recurso,id,dados) {
    const reposta = await fetch (`${API_URL}/${recurso}/${id}`,{
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dados)
    })
    return reposta.json()
}

// Remove um item pelo id (DELETE)
async function remover (recurso, id) {
    const reposta = await fetch(`${API_URL}/${recurso}/${id}`, {
        method: "DELETE"
    })
    return reposta.json()
}

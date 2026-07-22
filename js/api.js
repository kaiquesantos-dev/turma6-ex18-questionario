const API_URL = "http://localhost:3000"

async function buscarRecursos(recurso) {
    const resposta = await fetch (`${API_URL}/${recurso}`);
    return resposta.json()
    
}

async function buscarPorId(recurso, id ){
    const resposta = await fetch(`${API_URL}/${recurso}/${id}`);
    return resposta.json()
}

async function criar (recurso, dados ) {
    const reposta = await fetch(`${API_URL}/${recurso}`,{
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(dados)
    })
    return reposta.json()
}

async function atualizar (recurso,id,dados) {
    const reposta = await fetch (`${API_URL}/${recurso}/${id}`,{
        method: "PUT",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(dados)
    })
    return reposta.json()
}

async function remover (recurso, id) {
    const reposta = await fetch(`${API_URL}/${recurso}/${id}`, {
        method: "DELETE"
    })
    return reposta.json()
}
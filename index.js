require("dotenv").config();
const express = require('express');
const app = express();
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

//Necessário para extrair os dados de Forms vindos de uma requisição POST
app.use(express.json());
app.use(cors());


app.listen(3000, () => {
    console.log('Servidor na porta 3000');
});

const User = require('./model/User');
const Inscricao = require('./model/Inscricao');

//Requisicao com POST publica para autenticar usuário
app.post('/login', async (req,res) => {

    //extraindo os dados do formulário para criacao do usuario
    const {email, password} = req.body; 
    
    //Abre o bd (aqui estamos simulando com arquivo)
    const jsonPath = path.join(__dirname, '.', 'db', 'banco-dados-usuario.json');
    const usuariosCadastrados = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' }));

    //verifica se existe usuario com email    
    for (let user of usuariosCadastrados){
        if(user.email === email){
            const passwordValidado = await bcrypt.compare(password, user.password);
            if(passwordValidado){ 
                
                const token = jwt.sign(user, process.env.TOKEN);

                return res.json({ "token" : token});
            }
            
            else
                return res.status(422).send(`Usuario ou senhas incorretas.`);
        }   
    }
    //Nesse ponto não existe usuario com email informado.
    return res.status(409).send(`Usuario com email ${email} não existe. Considere criar uma conta!`);

})

//Requisicao com POST publica para criar usuário
app.post('/create-user', async (req,res) => {
    //extraindo os dados do formulário para criacao do usuario
    const {username, email, password} = req.body; 
    
    const jsonPath = path.join(__dirname, '.', 'db', 'banco-dados-usuario.json');
    const usuariosCadastrados = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' }));

    //verifica se já existe usuario com o email informado
    
    for (let users of usuariosCadastrados){
        if(users.email === email){
            //usuario já existe. Impossivel criar outro
            //Retornando o erro 409 para indicar conflito
            return res.status(409).send(`Usuario com email ${email} já existe.`);
        }   
    }
    //Deu certo. Vamos colocar o usuário no "banco"
    //Gerar um id incremental baseado na qt de users
    const id = usuariosCadastrados.length + 1;
    

    //gerar uma senha cryptografada
    const salt = await bcrypt.genSalt(10);
    const passwordCrypt = await bcrypt.hash(password,salt);

    //Criacao do user
    const user = new User(id, username, email, passwordCrypt);

    //Salva user no "banco"
    usuariosCadastrados.push(user);
    fs.writeFileSync(jsonPath,JSON.stringify(usuariosCadastrados,null,2));
    res.send(`Tudo certo usuario criado com sucesso.`);
});

// Requisição que retorna os dados descriptografados do usuário
app.get('/mi', verificaToken, (req, res) => {

    const authHeaders = req.headers['authorization'];
    const token = authHeaders && authHeaders.split(' ')[1]
    
    try {
      const decodedToken = jwt.decode(token, process.env.TOKEN);
      return res.status(200).json(decodedToken);
    } catch (error) {
      return res.status(401).json({ error: 'Falha na decodificação do token' });
    }
});
  

// Função para retornar todas as repúblicas disponíveis
app.get('/republicas', verificaToken,  (req,res) => {

    const jsonPath = path.join(__dirname, '.', 'db', 'banco-dados-republicas.json');
    const republicas = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' }));

    return res.json(republicas);

})

// Função para retornar uma reública com base no seu nome
app.get('/republica/:nome', verificaToken, (req,res) => {

    const jsonPath = path.join(__dirname, '.', 'db', 'banco-dados-republicas.json');
    const republicas = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' }));

    const params = req.params;    
    //buscar republica
    for(let republica of republicas){
        if(params.nome===republica.nome){
            return res.json(republica);
        }
    }
    return res.status(403).send(`Nome Não Encontrada!`);

})

// Função para retornar uma reública com base no seu id
app.get('/republica/:id', verificaToken, (req,res) => {

    const jsonPath = path.join(__dirname, '.', 'db', 'banco-dados-republicas.json');
    const republicas = JSON.parse(fs.readFileSync(jsonPath, { encoding: 'utf8', flag: 'r' }));

    const params = req.params;    
    //buscar republica
    for(let republica of republicas){
        if(params.id===republica.id){
            return res.json(republica);
        }
    }
    return res.status(403).send(`Nome Não Encontrada!`);

})

// Função para criar uma inscrição
app.post('/create-inscricao',verificaToken, async (req,res) => {
    //extraindo os dados do formulário para criacao da inscrição
    const {nome, idade, cidade, curso, redeSocial, celular, sobre, curiosidade, motivoEscolha,republicaId,username} = req.body; 
    
    const jsonPathInscricoes = path.join(__dirname, '.', 'db', 'banco-dados-inscricoes.json');
    const inscricoesCadastradas = JSON.parse(fs.readFileSync(jsonPathInscricoes, { encoding: 'utf8', flag: 'r' }));

    const jsonPathRepublicas = path.join(__dirname, '.', 'db', 'banco-dados-republicas.json');
    const republicasCadastradas = JSON.parse(fs.readFileSync(jsonPathRepublicas, { encoding: 'utf8', flag: 'r' }));

    const jsonPathUsuarios = path.join(__dirname, '.', 'db', 'banco-dados-usuario.json');
    const usuariosCadastrados = JSON.parse(fs.readFileSync(jsonPathUsuarios, { encoding: 'utf8', flag: 'r' }));

    //Deu certo. Vamos colocar a inscrição no "banco"
    //Gerar um id incremental baseado na qt de inscrições
    const id = inscricoesCadastradas.length + 1;

    //Criacao da inscrição
    const inscricao = new Inscricao(id, nome, idade, cidade, curso, redeSocial, celular, sobre, curiosidade, motivoEscolha);

    //Salva inscrição no "banco"
    inscricoesCadastradas.push(inscricao);
    fs.writeFileSync(jsonPathInscricoes,JSON.stringify(inscricoesCadastradas,null,2));

    //Salva o id da inscrição no atributo "inscrições" da república na qual foi cadastrada uma inscrição
    const republica = republicasCadastradas.find((republica) => republica.id === republicaId);
    republica.inscricoes.push(id);
    //Salva o arquivo
    fs.writeFileSync(jsonPathRepublicas, JSON.stringify(republicasCadastradas, null, 2));

    //Salva o id da inscrição no atributo "inscrições" do usuário ao qual cadastrou uma inscrição
    const usuario = usuariosCadastrados.find((usuario) => usuario.id === username);
    usuario.inscricoes.push(id);
    //Salva o arquivo
    fs.writeFileSync(jsonPathUsuarios, JSON.stringify(usuariosCadastrados, null, 2));

    res.send(`Inscrição criada com sucesso`);
});

// Rota para listar todas inscrições
app.get('/inscricoes', (req, res, username) => {

    const jsonPathUsuarios = path.join(__dirname, '.', 'db', 'banco-dados-usuario.json');
    const usuariosCadastrados = JSON.parse(fs.readFileSync(jsonPathUsuarios, { encoding: 'utf8', flag: 'r' }));

    let data = 'Suas inscrições' + '\n';

    const usuario = usuariosCadastrados.find((usuario) => usuario.username === username);
    for(let inscricao of usuario.inscricoes) {
        data += "Id: " + inscricao + '\n' + "República: " + ' ' + buscaRepublica(inscricao) + '\n';
    }

    return res.json(data);
});

function verificaToken(req,res,next){

    const authHeaders = req.headers['authorization'];
    
    const token = authHeaders && authHeaders.split(' ')[1]
    //Bearer token

    if(token == null) return res.status(401).send('Acesso Negado');

    jwt.verify(token, process.env.TOKEN, (err) => {
        if(err) return res.status(403).send('Token Inválido/Expirado');
        next();
    })

}

//Função para pegar nome de uma república que possuir inscrição com id passado como parâmetro
function buscaRepublica(id) {
    
    const jsonPathRepublicas = path.join(__dirname, '.', 'db', 'banco-dados-republicas.json');
    const republicasCadastradas = JSON.parse(fs.readFileSync(jsonPathRepublicas, { encoding: 'utf8', flag: 'r' }));

    for(let rep of republicasCadastradas) {
        for(let inscricao of rep.inscricoes) {
            if(inscricao === id) {
                let nomeRep = rep.nome;
                return nomeRep;
            }
        }
    }
}
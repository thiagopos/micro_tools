import express from "express";
import session from "express-session";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import moment from "moment";
import dotenv from "dotenv";
import loginRoutes from "./routes/login.js";
import cardapioRoutes from "./routes/cardapioRoutes.js";
import zeladoriaRoutes from "./routes/zeladoriaRoutes.js";
import blogRouter from "./routes/blogRoutes.js";
import apiRoutes from "./routes/apiRoutes.js";
import protocoloRoutes from "./routes/protocoloRoutes.js";
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar ambiente
dotenv.config();
moment.locale("pt-br");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS e diretório público
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Configuração do diretório estático para os arquivos de upload
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configuração da sessão com armazenamento em memória
app.use(
  session({
    secret: process.env.SESSION_SECRET || "segredo_super_secreto",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // se estiver usando HTTPS, altere para true
  })
);

// Middleware para verificar autenticação
function isAuthenticated(req, res, next) {
  
  if (req.session.user && req.session.user.loggedIn) {
    next(); // Usuário está autenticado, permitir acesso
  } else {
    res.redirect("/login"); // Redirecionar para login se não estiver autenticado
  }
}

// Conectar ao banco de dados
let db;
(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  await criarTabelaCardapio(db);
  await createBlogTable(db);
  await createSetoresTable(db);
  await createProtocolosTable(db);

  app.use((req, res, next) => {
    req.db = db; // Disponibiliza o banco de dados em todas as rotas
    next();
  });

  // Proteger todas as rotas de cardápio com middleware de autenticação
  app.use("/cardapio", isAuthenticated, cardapioRoutes);

  // Proteger todas as rotas de cardápio com middleware de autenticação
  app.use("/zeladoria", isAuthenticated, zeladoriaRoutes);

  // Proteger todas as rotas de blog com middleware de autenticação
  app.use("/blog", isAuthenticated, blogRouter);

  // Proteger todas as rotas de protocolos com middleware de autenticação
  app.use("/protocolos", protocoloRoutes);
  
  // Expor a API sem autenticação
  app.use("/api", apiRoutes); // Isso vai permitir acessar a rota de API sem passar pelo middleware

  // Rota de login
  app.use("/", loginRoutes);

  // Iniciar servidor
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}/login`);
  });
})();


async function criarTabelaCardapio(db) {
  const query = `
    CREATE TABLE IF NOT EXISTS cardapio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia DATE NOT NULL,
      refeicao TEXT NOT NULL,
      prato_principal TEXT NOT NULL,
      opcao TEXT NOT NULL,
      guarnicao TEXT NOT NULL,
      salada TEXT NOT NULL,
      suco TEXT NOT NULL,
      sobremesa TEXT NOT NULL,
      UNIQUE (dia, refeicao)
    )
  `;
  
  try {
    await db.run(query);
    console.log("Tabela 'cardapio' criada com sucesso.");
  } catch (err) {
    console.error("Erro ao criar a tabela 'cardapio':", err);
  }
}

// Função para criar a tabela de blog, caso não exista
async function createBlogTable(db) { 

  // Cria a tabela se ela não existir
  const query = `
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      content TEXT NOT NULL,     
      created_at TEXT DEFAULT (datetime('now'))      
    )
  `;

  try {
    await db.run(query);
    console.log("Tabela 'blog' criada com sucesso.");
  } catch (err) {
    console.error("Erro ao criar a tabela 'blog':", err);
  }
}

async function createSetoresTable(db) {
  const query = `
    CREATE TABLE IF NOT EXISTS setores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      setor_pai_id INTEGER,
      FOREIGN KEY (setor_pai_id) REFERENCES setores(id)
    )
  `;

  try {
    await db.run(query);
    console.log("Tabela 'setores' criada com sucesso.");
  } catch (err) {
    console.error("Erro ao criar a tabela 'setores':", err);
  }
}

async function createProtocolosTable(db) {
  const query = `
    CREATE TABLE IF NOT EXISTS protocolos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome_exibicao TEXT NOT NULL,
      codigo_identificacao TEXT NOT NULL,
      arquivo TEXT NOT NULL,
      setor_responsavel_id INTEGER NOT NULL,
      nome_salvo TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (setor_responsavel_id) REFERENCES setores(id)
    )
  `;

  try {
    await db.run(query);
    console.log("Tabela 'protocolos' criada com sucesso.");
  } catch (err) {
    console.error("Erro ao criar a tabela 'protocolos':", err);
  }
}

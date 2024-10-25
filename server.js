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

// Configurar ambiente
dotenv.config();
moment.locale("pt-br");

const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS e diretório público
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

  app.use((req, res, next) => {
    req.db = db; // Disponibiliza o banco de dados em todas as rotas
    next();
  });

  // Proteger todas as rotas de cardápio com middleware de autenticação
  app.use("/cardapio", isAuthenticated, cardapioRoutes);

  // Proteger todas as rotas de cardápio com middleware de autenticação
  app.use("/zeladoria", isAuthenticated, zeladoriaRoutes);

  // Proteger todas as rotas de blog com middleware de autenticação
  app.use("/blog", isAuthenticated,blogRouter);
  
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
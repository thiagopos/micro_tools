// Importar dependências
import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import moment from "moment";
import dotenv from "dotenv";

// Configurar ambiente
dotenv.config();
moment.locale("pt-br");

// Criar aplicativo Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar EJS e diretório público
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Conectar ao banco de dados
let db;
(async () => {
  db = await open({
    filename: "./database.db",
    driver: sqlite3.Database,
  });

  // Criar tabela se não existir
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cardapio (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia TEXT,
      refeicao TEXT,
      prato_principal TEXT,
      opcao TEXT,
      guarnicao TEXT,
      salada TEXT,
      suco TEXT,
      sobremesa TEXT
    )`);
})();

// Função auxiliar para obter datas da semana atual e próxima
function getWeekDates() {
  // Obter início da semana atual (segunda-feira)
  const startOfWeek = moment().startOf("isoWeek");
  const days = [];

  // Gerar datas da semana atual e próxima
  for (let i = 0; i < 14; i++) {
    days.push(startOfWeek.clone().add(i, "days").format("YYYY-MM-DD"));
  }

  return days;
}

// Função para salvar ou atualizar um registro de cardápio
async function salvarCardapio(db, req) {
  // Extrair dados do corpo da requisição
  let { dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa } = req.body;

  const sanitizeInput = (input) => {
    if (typeof input !== "string") return ""; // Garantir que a entrada é uma string
    
    // Sanitização e formatação
    const sanitized = input
      .trim() // Remove espaços em branco no início e no fim
      .replace(/[^a-zA-Z0-9À-ÿ() /\\]/g, "") // Remove caracteres não permitidos
      .slice(0, 50); // Corta a string para no máximo 50 caracteres
    
    // Formatar para lowercase com a primeira letra maiúscula
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
  };  

  // Função para validar a data no formato YYYY-MM-DD
  const validateDate = (date) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/; // Regex para verificar o formato YYYY-MM-DD
    return regex.test(date); // Retorna true se a data está no formato correto
  };  

  // Sanitizar todos os campos
  dia = dia ? dia.trim() : ''; // Remover espaços em branco antes de validar
  if (!validateDate(dia)) {
    console.log("Tentativa de salvar uma data em formato invalido:", dia);
    return;
  }
  refeicao = sanitizeInput(refeicao);
  prato_principal = sanitizeInput(prato_principal);
  opcao = sanitizeInput(opcao);
  guarnicao = sanitizeInput(guarnicao);
  salada = sanitizeInput(salada);
  suco = sanitizeInput(suco);
  sobremesa = sanitizeInput(sobremesa);
  
  

  // Verificar se existe um registro para o dia e refeição
  const existingEntry = await db.get("SELECT * FROM cardapio WHERE dia = ? AND refeicao = ?", [dia, refeicao]);

  if (existingEntry) {
    // Atualizar o registro existente
    await db.run(
      `
      UPDATE cardapio
      SET prato_principal = ?, opcao = ?, guarnicao = ?, salada = ?, suco = ?, sobremesa = ?
      WHERE dia = ? AND refeicao = ?
    `,
      [prato_principal, opcao, guarnicao, salada, suco, sobremesa, dia, refeicao]
    );
  } else {
    // Inserir um novo registro
    await db.run(
      `
      INSERT INTO cardapio (dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa]
    );
  }

  // Excluir registros da semana anterior
  const startOfLastWeek = moment().subtract(2, "weeks").startOf("isoWeek").format("YYYY-MM-DD");
  const endOfLastWeek = moment().subtract(2, "weeks").endOf("isoWeek").format("YYYY-MM-DD");

  await db.run(
    `
    DELETE FROM cardapio
    WHERE dia BETWEEN ? AND ?
    `,
    [startOfLastWeek, endOfLastWeek]
  );  
}

app.get("/", async (req, res) => {
  res.render("login");
});

// Rotas da aplicação
app.get("/cardapio", async (req, res) => {
  // Renderizar página de cardápio
  res.render("cardapio/cardapio");
});

app.get("/cardapio/atual", async (req, res) => {
  // Obter datas da semana atual
  const weekDates = getWeekDates().slice(0, 7);

  // Buscar registros de cardápio para a semana atual
  const cardapio = await db.all(
    `
    SELECT * FROM cardapio WHERE dia IN (${weekDates.map(() => "?").join(",")})
  `,
    weekDates
  );

  // Renderizar página de cardápio atual
  res.render("cardapio/atual", { cardapio, weekDates, moment });
});

app.get("/cardapio/proximo", async (req, res) => {
  // Obter datas da semana próxima
  const weekDates = getWeekDates().slice(7, 14);

  // Buscar registros de cardápio para a semana próxima
  const cardapio = await db.all(
    `
    SELECT * FROM cardapio WHERE dia IN (${weekDates.map(() => "?").join(",")})
  `,
    weekDates
  );

  // Renderizar página de cardápio próximo
  res.render("cardapio/proximo", { cardapio, weekDates, moment });
});

// Rotas para salvar ou atualizar registros de cardápio
app.post("/cardapio", async (req, res) => {
  await salvarCardapio(db, req);
  res.redirect("/cardapio");
});

app.post("/cardapio/atual", async (req, res) => {
  await salvarCardapio(db, req);
  res.redirect("/cardapio/atual");
});

app.post("/cardapio/proximo", async (req, res) => {
  await salvarCardapio(db, req);
  res.redirect("/cardapio/proximo");
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor está rodando em http://localhost:${PORT}/cardapio`);
});

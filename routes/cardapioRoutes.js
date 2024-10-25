import express from "express";
import moment from "moment";

// Inicializa o router
const router = express.Router();

// Função auxiliar para obter as datas da semana atual e próxima
function getWeekDates() {
  const startOfWeek = moment().startOf("isoWeek");
  const days = [];

  for (let i = 0; i < 14; i++) {
    days.push(startOfWeek.clone().add(i, "days").format("YYYY-MM-DD"));
  }

  return days;
}

// Função para salvar ou atualizar um registro de cardápio
async function salvarCardapio(db, req) {
  let { dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa } = req.body;

  const sanitizeInput = (input) => {
    if (typeof input !== "string") return "";
    const sanitized = input.trim().replace(/[^a-zA-Z0-9À-ÿ() /\\]/g, "").slice(0, 50);
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1).toLowerCase();
  };

  const validateDate = (date) => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    return regex.test(date);
  };

  dia = dia ? dia.trim() : '';
  if (!validateDate(dia)) return;

  refeicao = sanitizeInput(refeicao);
  prato_principal = sanitizeInput(prato_principal);
  opcao = sanitizeInput(opcao);
  guarnicao = sanitizeInput(guarnicao);
  salada = sanitizeInput(salada);
  suco = sanitizeInput(suco);
  sobremesa = sanitizeInput(sobremesa);

  const existingEntry = await db.get("SELECT * FROM cardapio WHERE dia = ? AND refeicao = ?", [dia, refeicao]);

  if (existingEntry) {
    await db.run(
      `UPDATE cardapio SET prato_principal = ?, opcao = ?, guarnicao = ?, salada = ?, suco = ?, sobremesa = ? WHERE dia = ? AND refeicao = ?`,
      [prato_principal, opcao, guarnicao, salada, suco, sobremesa, dia, refeicao]
    );
  } else {
    await db.run(
      `INSERT INTO cardapio (dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [dia, refeicao, prato_principal, opcao, guarnicao, salada, suco, sobremesa]
    );
  }

  const startOfLastWeek = moment().subtract(2, "weeks").startOf("isoWeek").format("YYYY-MM-DD");
  const endOfLastWeek = moment().subtract(2, "weeks").endOf("isoWeek").format("YYYY-MM-DD");

  await db.run(
    `DELETE FROM cardapio WHERE dia BETWEEN ? AND ?`,
    [startOfLastWeek, endOfLastWeek]
  );
}

// Rotas
router.get("/atual", async (req, res) => {
  const weekDates = getWeekDates().slice(0, 7);
  const cardapio = await req.db.all(`SELECT * FROM cardapio WHERE dia IN (${weekDates.map(() => "?").join(",")})`, weekDates);
  res.render("cardapio/atual", { cardapio, weekDates, moment });
});

router.get("/proximo", async (req, res) => {
  const weekDates = getWeekDates().slice(7, 14);
  const cardapio = await req.db.all(`SELECT * FROM cardapio WHERE dia IN (${weekDates.map(() => "?").join(",")})`, weekDates);
  res.render("cardapio/proximo", { cardapio, weekDates, moment });
});

// Other routes...
router.post("/", async (req, res) => {
  res.redirect("/cardapio/proximo");
});

router.post("/atual", async (req, res) => {
  await salvarCardapio(req.db, req);
  res.redirect("/cardapio/atual");
});

router.post("/proximo", async (req, res) => {
  await salvarCardapio(req.db, req);
  res.redirect("/cardapio/proximo");
});

export default router;
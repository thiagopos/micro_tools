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

// API CARDAPIO, SERVE O CARDAPIO DA SEMANA ATUAL SEM NECESSIDADE DE LOGIN
router.get("/cardapio", async (req, res) => {
  const weekDates = getWeekDates().slice(0, 7);
  const cardapio = await req.db.all(`SELECT * FROM cardapio WHERE dia IN (${weekDates.map(() => "?").join(",")})`, weekDates);

  // Formatar a data no formato "DD/MM DIADASEMANA"
  const cardapioFormatado = cardapio.map(item => {
    const diaFormatado = moment(item.dia).format('DD/MM dddd'); // Formata para "22/10 Segunda"
    return {
      ...item,
      dia: diaFormatado
    };
  });

  res.json(cardapioFormatado);
});

// API DO BLOG, POSSUI ENDPOINTS PARA BUSCAR POSTS OU UM POST ESPECIFICO
router.get("/posts", async (req, res) => {
  const posts = await req.db.all(`SELECT * FROM posts`);
  res.json(posts);
});

// Rota para buscar posts com paginação (API)
router.get("/posts/:startId/:limit", async (req, res) => {
  const posts = await req.db.all(`SELECT * FROM posts WHERE id > ? LIMIT ?`, [req.params.startId, req.params.limit])
  res.json(posts);
});

// Rota para buscar post por ID (API)
router.get("/post/:id", async (req, res) => {
  const post = await req.db.get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
  res.json(post);
});

export default router;
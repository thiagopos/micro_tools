import express from "express";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();
const router = express.Router();

router.get("/login", (req, res) => {
  res.render("login");
});

// Função para retornar o hash correto com base na opção selecionada
function getHashForOption(option) {
  switch (option) {
    case "cardapio":
      return process.env.CARDAPIO_CRYPT.trim();
    case "protocolos":
      return process.env.PROTOCOLOS_CRYPT.trim();
    case "dti_blog":
      return process.env.DTIBLOG_CRYPT.trim();
    case "zeladoria":
      return process.env.ZELADORIA_CRYPT.trim();
    default:
      return null;
  }
}

// Rota de login
router.post("/login", async (req, res) => {
  const { options, password } = req.body;

  // Obter o hash correspondente à opção selecionada
  const hash = getHashForOption(options);

  if (!hash) {
    return res.status(400).send("Opção inválida.");
  }

  // Comparar senha com o hash usando bcrypt
  const match = await bcrypt.compare(password, hash);

  console.log(password);
  console.log(hash);
  console.log(match);
  if (match) {
    // Armazenar informações do login na sessão (em memória)
    req.session.user = {
      loggedIn: true,
      system: options,
    };

    // Redirecionar com base no sistema selecionado
    switch (options) {
      case "cardapio":
        return res.redirect("/cardapio/proximo");
      case "protocolos":
        return res.redirect("/protocolos"); // Ajustar a rota conforme necessário
      case "dti_blog":
        return res.redirect("/blog/criar-post"); // Ajustar a rota conforme necessário
      case "zeladoria":
        return res.redirect("/zeladoria/listaPacientes");
      default:
        return res.redirect("/");
    }
  } else {
    // Se a senha estiver incorreta
    return res.status(401).send("Senha incorreta.");
  }
});

// Rota de logout para encerrar a sessão
router.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Erro ao encerrar a sessão.");
    }
    res.redirect("/login");
  });
});

export default router;

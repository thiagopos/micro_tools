import express from "express";
import moment from "moment";

const router = express.Router();

// Rota para criar novo post
router.get("/criar-post", (req, res) => {
  res.render("blog/criar-post", { moment });
});

// Rota para criar novo post (API)
router.post("/criar-post", async (req, res) => {
  const { titulo, autor, conteudo } = req.body;  

  console.log({ titulo, autor, conteudo});

  await req.db.run(
    "INSERT INTO posts (title, author, content, created_at) VALUES (?, ?, ?, ?)",
    [titulo, autor, conteudo, moment().format('YYYY-MM-DD')]
  );
  res.redirect("/blog/criar-post");
});

router.get("/posts", async (req, res) => {
  const posts = await req.db.all("SELECT * FROM posts ORDER BY created_at DESC");
  res.render("blog/listar-posts", { posts, moment });
});

router.get("/post/:id", async (req, res) => {
  const post = await req.db.get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
  res.render("blog/ver-post", { post, moment });
});

router.get("/editar-post/:id", async (req, res) => {
  const post = await req.db.get("SELECT * FROM posts WHERE id = ?", [req.params.id]);
  res.render("blog/editar-post", { post });
});

router.post("/editar-post/:id", async (req, res) => {
  const { titulo, autor, conteudo } = req.body;
  await req.db.run(
    "UPDATE posts SET title = ?, author = ?, content = ? WHERE id = ?",
    [titulo, autor, conteudo, req.params.id]
  );
  res.redirect("/blog/post/" + req.params.id);
});

router.post("/excluir-post/:id", async (req, res) => {
  await req.db.run("DELETE FROM posts WHERE id = ?", [req.params.id]);
  res.redirect("/blog/posts");
});




export default router;
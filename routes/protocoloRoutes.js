import express from "express";
import moment from "moment";
import crypto from "crypto";
import fs from "fs";
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const router = express.Router();

// Esta linha obtém o caminho absoluto do arquivo atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do Multer para salvar arquivos em 'uploads' com nomes únicos
const uploadDir = path.join(__dirname, 'uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const hash = crypto.randomBytes(4).toString("hex"); // Gera um hash de 8 caracteres
    const fileName = `${hash}.pdf`;
    cb(null, fileName);
  }
});
const upload = multer({ storage });


/* ROTAS PARA SETORES */

// Rota para visualizar a página de criação de setor
  router.get("/setores/criar", async (req, res) => {
    const setores = await req.db.all("SELECT * FROM setores");
    res.render("setores/criar-setor", { setores, moment });
  });

// Rota para criar um setor (POST)
router.post("/setores/criar", async (req, res) => {
  const { nome, setor_pai_id } = req.body;  

  await req.db.run(
    "INSERT INTO setores (nome, setor_pai_id) VALUES (?, ?)",
    [nome, setor_pai_id || null]
  );
  res.redirect("/protocolos/setores");
});

// Rota para listar todos os setores
router.get("/setores", async (req, res) => {
  const setores = await req.db.all("SELECT * FROM setores ORDER BY nome ASC");
  res.render("setores/listar-setores", { setores, moment });
});

// Rota para visualizar a página de edição de setor
router.get("/setores/editar/:id", async (req, res) => {
  const setor = await req.db.get("SELECT * FROM setores WHERE id = ?", [req.params.id]);
  const setores = await req.db.all("SELECT * FROM setores");
  res.render("setores/editar-setor", { setor, setores });
});

// Rota para editar um setor (POST)
router.post("/setores/editar/:id", async (req, res) => {
  const { nome, setor_pai_id } = req.body;

  await req.db.run(
    "UPDATE setores SET nome = ?, setor_pai_id = ? WHERE id = ?",
    [nome, setor_pai_id || null, req.params.id]
  );
  res.redirect("/protocolos/setores");
});

// Rota para excluir um setor
router.post("/setores/excluir/:id", async (req, res) => {
  await req.db.run("DELETE FROM setores WHERE id = ?", [req.params.id]);
  res.redirect("/protocolos/setores");
});

// Rota para buscar setores filhos com base em um setor pai
router.get('/setores/filhos/:setorPaiId', async (req, res) => {
  const { setorPaiId } = req.params;

  try {
    const setoresFilhos = await req.db.all(
      'SELECT * FROM setores WHERE setor_pai_id = ?',
      [setorPaiId]
    );
    res.json(setoresFilhos);
  } catch (err) {
    console.error('Erro ao buscar setores filhos:', err);
    res.status(500).json({ error: 'Erro ao buscar setores filhos' });
  }
});


/* ROTAS PARA PROTOCOLOS */

// Rota para visualizar a página de criação de protocolo
router.get('/criar', async (req, res) => {
  try {
    // Seleciona apenas setores que podem ser pais
    const setores = await req.db.all(
      'SELECT * FROM setores WHERE setor_pai_id IS NULL'
    );
    res.render('protocolos/criar-protocolo', { setores });
  } catch (err) {
    console.error('Erro ao buscar setores:', err);
    res.status(500).send('Erro ao carregar a página de criação de protocolo');
  }
});

// Rota para criar um protocolo (POST) com upload de arquivo
router.post('/criar', upload.single('arquivo'), async (req, res) => {
  const { nome_exibicao, codigo_identificacao, setor_pai_id, setor_responsavel_id } = req.body;
  
  // `req.file` terá o arquivo enviado, e `req.body` terá os outros campos do formulário
  const nome_salvo = req.file ? req.file.filename : null;
  
  try {
    await req.db.run(
      'INSERT INTO protocolos (nome_exibicao, codigo_identificacao, arquivo, setor_responsavel_id, nome_salvo, created_at) VALUES (?, ?, ?, ?, ?, datetime("now"))',
      [nome_exibicao, codigo_identificacao, nome_salvo, setor_responsavel_id || setor_pai_id, nome_salvo]
    );
    res.redirect('/protocolos');
  } catch (err) {
    console.error('Erro ao criar protocolo:', err);
    res.status(500).send('Erro ao criar protocolo');
  }
});



// Rota para listar todos os protocolos
router.get("/", async (req, res) => {
  const protocolos = await req.db.all(`
    SELECT protocolos.*, setores.nome AS setor_responsavel 
    FROM protocolos 
    JOIN setores ON protocolos.setor_responsavel_id = setores.id
    ORDER BY protocolos.created_at DESC
  `);
  res.render("protocolos/listar-protocolo", { protocolos, moment });
});

// Rota para visualizar um protocolo específico
router.get("/:id", async (req, res) => {
  const protocolo = await req.db.get(`
    SELECT protocolos.*, setores.nome AS setor_responsavel 
    FROM protocolos 
    JOIN setores ON protocolos.setor_responsavel_id = setores.id 
    WHERE protocolos.id = ?`,
    [req.params.id]
  );
  res.render("protocolos/ver-protocolo", { protocolo, moment });
});

// Rota para visualizar a página de edição de protocolo
router.get("/editar/:id", async (req, res) => {
  const protocolo = await req.db.get("SELECT * FROM protocolos WHERE id = ?", [req.params.id]);
  const setores = await req.db.all("SELECT * FROM setores");
  res.render("protocolos/editar-protocolo", { protocolo, setores });
});

// Rota para editar um protocolo (POST)
router.post("/editar/:id", async (req, res) => {
  const { nome_exibicao, codigo_identificacao, setor_responsavel_id } = req.body;
  await req.db.run(
    "UPDATE protocolos SET nome_exibicao = ?, codigo_identificacao = ?, setor_responsavel_id = ? WHERE id = ?",
    [nome_exibicao, codigo_identificacao, setor_responsavel_id, req.params.id]
  );
  res.redirect("/protocolos/" + req.params.id);
});

// Rota para excluir um protocolo
router.post("/excluir/:id", async (req, res) => {
  const protocolo = await req.db.get("SELECT arquivo FROM protocolos WHERE id = ?", [req.params.id]);
  const arquivoPath = path.join(__dirname, "uploads", protocolo.arquivo);

  // Remover o arquivo fisicamente
  if (fs.existsSync(arquivoPath)) {
    fs.unlinkSync(arquivoPath);
  }

  // Remover o registro do banco de dados
  await req.db.run("DELETE FROM protocolos WHERE id = ?", [req.params.id]);
  res.redirect("/protocolos");
});

// Rota de download do arquivo do protocolo
router.get('/download/:id', async (req, res) => {
  try {
    // Busca o arquivo pelo ID do protocolo
    const protocolo = await req.db.get("SELECT arquivo FROM protocolos WHERE id = ?", [req.params.id]);
    
    if (!protocolo || !protocolo.arquivo) {
      return res.status(404).send("Arquivo não encontrado para este protocolo.");
    }

    // Define o caminho completo do arquivo
    const arquivoPath = path.join(__dirname, "uploads", protocolo.arquivo);

    // Verifica se o arquivo existe
    if (!fs.existsSync(arquivoPath)) {
      return res.status(404).send("Arquivo não encontrado no servidor.");
    }

    // Define o tipo de conteúdo para exibição no navegador
    res.setHeader('Content-Type', 'application/pdf');

    // Envia o arquivo para download
    res.sendFile(arquivoPath, protocolo.arquivo, (err) => {
      if (err) {
        console.error("Erro ao enviar o arquivo:", err);
        res.status(500).send("Erro ao processar o download do arquivo.");
      }
    });
  } catch (error) {
    console.error("Erro ao processar a solicitação de download:", error);
    res.status(500).send("Erro interno ao processar o download.");
  }
});

export default router;

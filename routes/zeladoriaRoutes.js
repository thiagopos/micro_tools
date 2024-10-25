import dotenv from "dotenv";
import mysql from 'mysql2/promise';
import express from "express";
import moment from "moment";
import fastcsv from "fast-csv";
import { PassThrough } from 'stream';

const router = express.Router();
dotenv.config();

// Função para conectar ao banco e fazer a query
async function connectAndQuery() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });

    const [rows] = await connection.execute(`
      SELECT         
        cad_internacao.doc_rh,        
        cad_paciente.nome_completo,
        cad_paciente.dt_nascimento,        
        cad_internacao.desc_especialidade,
        cad_internacao.desc_clinica,
        cad_internacao.desc_leito,             
        cad_internacao.dt_entrada      
      FROM 
        cad_internacao
      JOIN 
        cad_paciente ON cad_internacao.id_paciente = cad_paciente.id_paciente
      WHERE 
        cad_internacao.dt_saida IS NULL
    `);

    return [rows, connection];
  } catch (error) {
    console.error('Error connecting to the database or executing the query:', error);
  }
}

// Rota para renderizar a página EJS
router.get("/listaPacientes", async (req, res) => {
  res.render("zeladoria/listaPacientes", {});  // Renderiza a página com o botão
});

// Rota para download dos dados como CSV
router.get("/downloadPacientes", async (req, res) => {
  const [rows, connection] = await connectAndQuery();

  if (!rows) {
    res.status(500).send("Error retrieving data");
    return;
  }

  // Encerrar a conexão com o banco de dados
  await connection.end();

  // Criar o stream para enviar o CSV
  const passThrough = new PassThrough();

  // Definir os cabeçalhos para download do arquivo CSV
  res.setHeader('Content-disposition', 'attachment; filename=pacientes.csv');
  res.setHeader('Content-Type', 'text/csv');

  // Mapeia e formata os dados
  const csvData = rows.map(patient => ({
    doc_rh: patient.doc_rh,
    nome_completo: patient.nome_completo.normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
    dt_nascimento: moment(patient.dt_nascimento).format('DD/MM/YYYY'),
    desc_especialidade: patient.desc_especialidade,
    desc_clinica: patient.desc_clinica.normalize('NFD').replace(/[\u0300-\u036f]/g, ""),
    desc_leito: patient.desc_leito,
    dt_entrada: moment(patient.dt_entrada).format('DD/MM/YYYY HH:mm:ss')
  }));

  // Gera o CSV e envia para o cliente
  fastcsv
    .write(csvData, { headers: true, delimiter: ';' })
    .pipe(passThrough)
    .pipe(res);
});

export default router;

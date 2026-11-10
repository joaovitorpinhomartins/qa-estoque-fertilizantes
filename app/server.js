import http from 'node:http';
import { readFileSync } from 'node:fs';
import { db, nextId, reset } from './store.js';
import { isNonEmptyString, isPositiveNumber } from './validacao.js';
import { criarPedido, cancelarPedido, agendarPedido } from './pedidos.js';
import { relatorioDemanda } from './relatorios.js';

const PORT = process.env.PORT || 3000;
const PAGINA = new URL('./public/index.html', import.meta.url);

const send = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};

const readJson = (req) =>
  new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
  });

// --- Fertilizantes ---------------------------------------------------------
function criarFertilizante(body) {
  if (!isNonEmptyString(body.nome)) return [400, { erro: 'Nome é obrigatório' }];
  if (!isPositiveNumber(body.preco)) return [400, { erro: 'Preço deve ser maior que zero' }];
  const nome = body.nome.trim();
  if (db.fertilizantes.some((f) => f.nome.toLowerCase() === nome.toLowerCase())) {
    return [409, { erro: 'Fertilizante já cadastrado' }];
  }
  const fertilizante = { id: nextId(), nome, preco: body.preco, saldo: 0 };
  db.fertilizantes.push(fertilizante);
  return [201, fertilizante];
}

function entradaEstoque(id, body) {
  const fertilizante = db.fertilizantes.find((f) => f.id === id);
  if (!fertilizante) return [404, { erro: 'Fertilizante não encontrado' }];
  if (!isPositiveNumber(body.quantidade)) {
    return [400, { erro: 'Quantidade deve ser maior que zero' }];
  }
  fertilizante.saldo += body.quantidade;
  return [200, fertilizante];
}

// --- Fazendas --------------------------------------------------------------
function criarFazenda(body) {
  if (!isNonEmptyString(body.nome)) return [400, { erro: 'Nome é obrigatório' }];
  if (!isNonEmptyString(body.tecnico)) return [400, { erro: 'Técnico responsável é obrigatório' }];
  if (!Array.isArray(body.pivos) || body.pivos.length === 0 || !body.pivos.every(isNonEmptyString)) {
    return [400, { erro: 'Informe ao menos um pivô' }];
  }
  const nome = body.nome.trim();
  if (db.fazendas.some((f) => f.nome.toLowerCase() === nome.toLowerCase())) {
    return [409, { erro: 'Fazenda já cadastrada' }];
  }
  const fazenda = {
    id: nextId(),
    nome,
    tecnico: body.tecnico.trim(),
    pivos: body.pivos.map((p) => ({ id: nextId(), nome: p.trim() })),
  };
  db.fazendas.push(fazenda);
  return [201, fazenda];
}

// --- Roteamento ------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const { method } = req;

  try {
    if (method === 'GET' && (pathname === '/' || pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(readFileSync(PAGINA));
    }

    if (method === 'GET' && pathname === '/health') return send(res, 200, { status: 'ok' });

    // Endpoint de apoio aos testes: limpa os dados entre cenários.
    if (method === 'POST' && pathname === '/test/reset') {
      reset();
      return send(res, 204);
    }

    if (method === 'GET' && pathname === '/fertilizantes') return send(res, 200, db.fertilizantes);
    if (method === 'POST' && pathname === '/fertilizantes') {
      const [status, body] = criarFertilizante(await readJson(req));
      return send(res, status, body);
    }

    const entrada = pathname.match(/^\/fertilizantes\/(\d+)\/entrada$/);
    if (method === 'POST' && entrada) {
      const [status, body] = entradaEstoque(Number(entrada[1]), await readJson(req));
      return send(res, status, body);
    }

    if (method === 'GET' && pathname === '/fazendas') return send(res, 200, db.fazendas);
    if (method === 'POST' && pathname === '/fazendas') {
      const [status, body] = criarFazenda(await readJson(req));
      return send(res, status, body);
    }

    if (method === 'GET' && pathname === '/pedidos') return send(res, 200, db.pedidos);
    if (method === 'POST' && pathname === '/pedidos') {
      const [status, body] = criarPedido(await readJson(req));
      return send(res, status, body);
    }

    const pedidoPorId = pathname.match(/^\/pedidos\/(\d+)$/);
    if (method === 'GET' && pedidoPorId) {
      const pedido = db.pedidos.find((p) => p.id === Number(pedidoPorId[1]));
      return pedido ? send(res, 200, pedido) : send(res, 404, { erro: 'Pedido não encontrado' });
    }

    const cancelamento = pathname.match(/^\/pedidos\/(\d+)\/cancelar$/);
    if (method === 'POST' && cancelamento) {
      const [status, body] = cancelarPedido(Number(cancelamento[1]));
      return send(res, status, body);
    }

    const agendamento = pathname.match(/^\/pedidos\/(\d+)\/agendar$/);
    if (method === 'POST' && agendamento) {
      const [status, body] = agendarPedido(Number(agendamento[1]), await readJson(req));
      return send(res, status, body);
    }

    if (method === 'GET' && pathname === '/relatorios/demanda') {
      return send(res, 200, relatorioDemanda());
    }

    return send(res, 404, { erro: 'Rota não encontrada' });
  } catch (err) {
    return send(res, 400, { erro: err.message });
  }
});

server.listen(PORT, () => console.log(`API de estoque rodando em http://localhost:${PORT}`));

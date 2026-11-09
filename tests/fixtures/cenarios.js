import { expect } from '@playwright/test';
import { gerarFertilizante, gerarFazenda } from './factories.js';

// Helpers que montam o estado inicial de um cenário via API.

export async function criarFertilizanteComEstoque(request, quantidade, overrides = {}) {
  const resposta = await request.post('/fertilizantes', { data: gerarFertilizante(overrides) });
  expect(resposta.status()).toBe(201);
  const fertilizante = await resposta.json();

  const entrada = await request.post(`/fertilizantes/${fertilizante.id}/entrada`, {
    data: { quantidade },
  });
  expect(entrada.status()).toBe(200);
  return entrada.json();
}

export async function criarFazendaComPivos(request, overrides = {}) {
  const resposta = await request.post('/fazendas', { data: gerarFazenda(overrides) });
  expect(resposta.status()).toBe(201);
  return resposta.json();
}

// Monta um item de pedido. Por padrão: pivô 1, 10 unidades, aplicação terrestre.
export function montarItem({
  fertilizante,
  fazenda,
  pivo = fazenda.pivos[0],
  quantidade = 10,
  tipoAplicacao = 'terrestre',
}) {
  return {
    fertilizanteId: fertilizante.id,
    fazendaId: fazenda.id,
    pivoId: pivo.id,
    quantidade,
    tipoAplicacao,
  };
}

export const emitirPedido = (request, itens) => request.post('/pedidos', { data: { itens } });

export async function buscarSaldo(request, fertilizanteId) {
  const lista = await (await request.get('/fertilizantes')).json();
  return lista.find((f) => f.id === fertilizanteId).saldo;
}

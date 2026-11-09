import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
} from '../fixtures/cenarios.js';
import { dataEmDias } from '../fixtures/datas.js';

async function criarPedidoPendente(request) {
  const fertilizante = await criarFertilizanteComEstoque(request, 100);
  const fazenda = await criarFazendaComPivos(request);
  const pedido = await (
    await emitirPedido(request, [montarItem({ fertilizante, fazenda })])
  ).json();
  return { pedido, fertilizante, fazenda };
}

const agendar = (request, pedidoId, dataAplicacao) =>
  request.post(`/pedidos/${pedidoId}/agendar`, { data: { dataAplicacao } });

const buscarPedido = async (request, id) => (await request.get(`/pedidos/${id}`)).json();

test.describe('Agendamento da data de aplicação', () => {
  test('CT08 - agenda data futura e muda o status para agendado', async ({ request }) => {
    const { pedido } = await criarPedidoPendente(request);
    const data = dataEmDias(7);

    const resposta = await agendar(request, pedido.id, data);

    expect(resposta.status()).toBe(200);
    const agendado = await resposta.json();
    expect(agendado.status).toBe('agendado');
    expect(agendado.dataAplicacao).toBe(data);
    expect(await buscarPedido(request, pedido.id)).toMatchObject({
      status: 'agendado',
      dataAplicacao: data,
    });
  });

  test('CT08 - aceita agendamento para o dia de hoje', async ({ request }) => {
    const { pedido } = await criarPedidoPendente(request);

    const resposta = await agendar(request, pedido.id, dataEmDias(0));

    expect(resposta.status()).toBe(200);
  });

  test('CT09 - rejeita data no passado e mantém o pedido pendente', async ({ request }) => {
    const { pedido } = await criarPedidoPendente(request);

    const resposta = await agendar(request, pedido.id, dataEmDias(-1));

    expect(resposta.status()).toBe(422);
    expect((await resposta.json()).erro).toContain('passado');
    expect(await buscarPedido(request, pedido.id)).toMatchObject({
      status: 'pendente',
      dataAplicacao: null,
    });
  });

  const datasInvalidas = [
    ['mês inexistente', '2030-13-01'],
    ['dia inexistente', '2030-02-30'],
    ['formato brasileiro', '15/12/2030'],
    ['texto', 'amanhã'],
    ['vazia', ''],
    ['ausente', undefined],
  ];

  for (const [descricao, data] of datasInvalidas) {
    test(`CT09 - rejeita data inválida (${descricao})`, async ({ request }) => {
      const { pedido } = await criarPedidoPendente(request);

      const resposta = await agendar(request, pedido.id, data);

      expect(resposta.status()).toBe(400);
      expect((await buscarPedido(request, pedido.id)).status).toBe('pendente');
    });
  }

  test('CT09 - retorna 404 ao agendar pedido inexistente', async ({ request }) => {
    const resposta = await agendar(request, 9999, dataEmDias(5));

    expect(resposta.status()).toBe(404);
  });

  test('CT09 - não agenda pedido cancelado', async ({ request }) => {
    const { pedido } = await criarPedidoPendente(request);
    await request.post(`/pedidos/${pedido.id}/cancelar`);

    const resposta = await agendar(request, pedido.id, dataEmDias(5));

    expect(resposta.status()).toBe(409);
    expect((await buscarPedido(request, pedido.id)).status).toBe('cancelado');
  });

  test('CT09 - não reagenda pedido já agendado', async ({ request }) => {
    const { pedido } = await criarPedidoPendente(request);
    await agendar(request, pedido.id, dataEmDias(5));

    const resposta = await agendar(request, pedido.id, dataEmDias(10));

    expect(resposta.status()).toBe(409);
    expect((await buscarPedido(request, pedido.id)).dataAplicacao).toBe(dataEmDias(5));
  });
});

test.describe('Pedido agendado e bloqueio de pivô', () => {
  test('CT06 - pedido agendado continua bloqueando outro pivô terrestre', async ({ request }) => {
    const { pedido, fertilizante, fazenda } = await criarPedidoPendente(request);
    await agendar(request, pedido.id, dataEmDias(3));

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[1] }),
    ]);

    expect(resposta.status()).toBe(422);
    expect((await resposta.json()).erro).toContain('Pivô bloqueado');
  });

  test('CT06 - cancelar um pedido agendado libera o pivô', async ({ request }) => {
    const { pedido, fertilizante, fazenda } = await criarPedidoPendente(request);
    await agendar(request, pedido.id, dataEmDias(3));
    await request.post(`/pedidos/${pedido.id}/cancelar`);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[1] }),
    ]);

    expect(resposta.status()).toBe(201);
  });
});

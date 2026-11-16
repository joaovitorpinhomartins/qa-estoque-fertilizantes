import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
  buscarSaldo,
  definirHoje,
  listarPedidos,
} from '../fixtures/cenarios.js';
import { dataEmDias } from '../fixtures/datas.js';

// Calendário usado nos cenários (janeiro de 2030):
//   Seg 07 | Ter 08 | Qua 09 | Qui 10 | Sex 11 | Sáb 12 | Dom 13
//   Seg 14 | Ter 15 | ...    | Sex 18 | Sáb 19 | Dom 20 | Seg 21
const SEG_07 = '2030-01-07';
const SEX_11 = '2030-01-11';
const SEG_14 = '2030-01-14';
const TER_15 = '2030-01-15';
const SEX_18 = '2030-01-18';
const SEG_21 = '2030-01-21';

async function emitirEm(request, data, { quantidade = 40, pivo = 0, tipoAplicacao } = {}) {
  const fertilizante = await criarFertilizanteComEstoque(request, 100);
  const fazenda = await criarFazendaComPivos(request);
  await definirHoje(request, data);
  const resposta = await emitirPedido(request, [
    montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[pivo], quantidade, tipoAplicacao }),
  ]);
  expect(resposta.status()).toBe(201);
  return { pedido: await resposta.json(), fertilizante, fazenda };
}

test.describe('Cancelamento automático por prazo (5 dias úteis sem data de aplicação)', () => {
  test('CT13 - mantém o pedido pendente no 5º dia útil', async ({ request }) => {
    const { pedido, fertilizante } = await emitirEm(request, SEG_07);

    await definirHoje(request, SEG_14);

    const [atual] = await listarPedidos(request);
    expect(atual.id).toBe(pedido.id);
    expect(atual.status).toBe('pendente');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(60);
  });

  test('CT13 - cancela no 6º dia útil, devolve o estoque e registra o motivo', async ({
    request,
  }) => {
    const { fertilizante } = await emitirEm(request, SEG_07);

    await definirHoje(request, TER_15);

    const [atual] = await listarPedidos(request);
    expect(atual).toMatchObject({
      status: 'cancelado',
      motivoCancelamento: 'prazo',
      criadoEm: SEG_07,
      canceladoEm: TER_15,
    });
    expect(await buscarSaldo(request, fertilizante.id)).toBe(100);
  });

  test('CT13 - sábado e domingo não contam como dia útil', async ({ request }) => {
    await emitirEm(request, SEX_11);

    await definirHoje(request, SEG_14); // 1º dia útil
    expect((await listarPedidos(request))[0].status).toBe('pendente');

    await definirHoje(request, SEX_18); // 5º dia útil
    expect((await listarPedidos(request))[0].status).toBe('pendente');

    await definirHoje(request, SEG_21); // 6º dia útil
    expect((await listarPedidos(request))[0].status).toBe('cancelado');
  });

  test('CT13 - pedido agendado não expira, mesmo depois do prazo', async ({ request }) => {
    const { pedido, fertilizante } = await emitirEm(request, SEG_07);
    const agendamento = await request.post(`/pedidos/${pedido.id}/agendar`, {
      data: { dataAplicacao: '2030-01-30' },
    });
    expect(agendamento.status()).toBe(200);

    await definirHoje(request, '2030-02-28');

    const [atual] = await listarPedidos(request);
    expect(atual.status).toBe('agendado');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(60);
  });

  test('CT13 - pedido vencido libera o pivô para aplicação terrestre em outro pivô', async ({
    request,
  }) => {
    const { fertilizante, fazenda } = await emitirEm(request, SEG_07, { pivo: 0 });
    await definirHoje(request, SEG_14);
    const bloqueado = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[1], quantidade: 10 }),
    ]);
    expect(bloqueado.status()).toBe(422);

    await definirHoje(request, TER_15);
    const liberado = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[1], quantidade: 10 }),
    ]);

    expect(liberado.status()).toBe(201);
  });

  test('CT13 - não permite agendar pedido já vencido', async ({ request }) => {
    const { pedido } = await emitirEm(request, SEG_07);
    await definirHoje(request, TER_15);

    const resposta = await request.post(`/pedidos/${pedido.id}/agendar`, {
      data: { dataAplicacao: '2030-02-01' },
    });

    expect(resposta.status()).toBe(409);
    expect((await listarPedidos(request))[0].status).toBe('cancelado');
  });

  test('CT13 - pedido vencido não entra no relatório de demanda', async ({ request }) => {
    await emitirEm(request, SEG_07);
    await definirHoje(request, TER_15);

    const demanda = await (await request.get('/relatorios/demanda')).json();

    expect(demanda).toEqual([]);
  });

  test('CT13 - cancelamento manual registra o motivo "manual"', async ({ request }) => {
    const { pedido } = await emitirEm(request, SEG_07);

    const resposta = await request.post(`/pedidos/${pedido.id}/cancelar`);

    expect((await resposta.json()).motivoCancelamento).toBe('manual');
  });
});

test.describe('Relógio de apoio aos testes', () => {
  test('rejeita data inválida no relógio', async ({ request }) => {
    const resposta = await request.post('/test/relogio', { data: { data: '2030-02-30' } });

    expect(resposta.status()).toBe(400);
  });

  test('o reset restaura o relógio real', async ({ request }) => {
    await definirHoje(request, SEG_07);
    await request.post('/test/reset');
    const fertilizante = await criarFertilizanteComEstoque(request, 10);
    const fazenda = await criarFazendaComPivos(request);

    const pedido = await (
      await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 1 })])
    ).json();

    expect(pedido.criadoEm).toBe(dataEmDias(0));
  });
});

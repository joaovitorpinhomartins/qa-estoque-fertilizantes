import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
} from '../fixtures/cenarios.js';

const buscarDemanda = async (request) => (await request.get('/relatorios/demanda')).json();

test.describe('Relatório de demanda por fertilizante', () => {
  test('CT10 - retorna lista vazia quando não há pedidos', async ({ request }) => {
    const resposta = await request.get('/relatorios/demanda');

    expect(resposta.status()).toBe(200);
    expect(await resposta.json()).toEqual([]);
  });

  test('CT10 - ordena os fertilizantes do mais demandado para o menos demandado', async ({
    request,
  }) => {
    const ureia = await criarFertilizanteComEstoque(request, 500, { nome: 'Ureia' });
    const kcl = await criarFertilizanteComEstoque(request, 500, { nome: 'Cloreto de Potássio' });
    const map = await criarFertilizanteComEstoque(request, 500, { nome: 'MAP' });
    const fazenda = await criarFazendaComPivos(request);

    await emitirPedido(request, [montarItem({ fertilizante: ureia, fazenda, quantidade: 20 })]);
    await emitirPedido(request, [montarItem({ fertilizante: kcl, fazenda, quantidade: 80 })]);
    await emitirPedido(request, [montarItem({ fertilizante: map, fazenda, quantidade: 50 })]);

    const demanda = await buscarDemanda(request);

    expect(demanda.map((d) => d.nome)).toEqual(['Cloreto de Potássio', 'MAP', 'Ureia']);
    expect(demanda.map((d) => d.quantidadeTotal)).toEqual([80, 50, 20]);
  });

  test('CT10 - soma quantidade, valor e número de pedidos do mesmo fertilizante', async ({
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 500, { preco: 10 });
    const fazenda = await criarFazendaComPivos(request);

    await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 30 })]);
    await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 20 })]);

    const [linha] = await buscarDemanda(request);

    expect(linha).toMatchObject({
      fertilizanteId: fertilizante.id,
      quantidadeTotal: 50,
      valorTotal: 500,
      pedidos: 2,
    });
  });

  test('CT10 - desconsidera pedidos cancelados', async ({ request }) => {
    const ureia = await criarFertilizanteComEstoque(request, 500, { nome: 'Ureia' });
    const kcl = await criarFertilizanteComEstoque(request, 500, { nome: 'KCl' });
    const fazenda = await criarFazendaComPivos(request);

    const cancelado = await (
      await emitirPedido(request, [montarItem({ fertilizante: ureia, fazenda, quantidade: 200 })])
    ).json();
    await emitirPedido(request, [montarItem({ fertilizante: kcl, fazenda, quantidade: 10 })]);
    await request.post(`/pedidos/${cancelado.id}/cancelar`);

    const demanda = await buscarDemanda(request);

    expect(demanda.map((d) => d.nome)).toEqual(['KCl']);
  });

  test('CT10 - desempata por nome quando a quantidade é igual', async ({ request }) => {
    const zinco = await criarFertilizanteComEstoque(request, 100, { nome: 'Zinco' });
    const boro = await criarFertilizanteComEstoque(request, 100, { nome: 'Boro' });
    const fazenda = await criarFazendaComPivos(request);

    await emitirPedido(request, [montarItem({ fertilizante: zinco, fazenda, quantidade: 10 })]);
    await emitirPedido(request, [montarItem({ fertilizante: boro, fazenda, quantidade: 10 })]);

    const demanda = await buscarDemanda(request);

    expect(demanda.map((d) => d.nome)).toEqual(['Boro', 'Zinco']);
  });
});

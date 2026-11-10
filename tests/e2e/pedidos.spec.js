import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
  buscarSaldo,
} from '../fixtures/cenarios.js';
import { dataEmDias } from '../fixtures/datas.js';
import { PedidosPage } from '../pages/PedidosPage.js';

const primeiroPedido = async (request) => (await (await request.get('/pedidos')).json())[0];

test.describe('Fluxo de pedido pela tela', () => {
  test('CT11 - fluxo completo: carrinho, emissão do pedido e agendamento', async ({
    page,
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100, { nome: 'Ureia', preco: 50 });
    await criarFazendaComPivos(request, { nome: 'Fazenda Boa Vista' });
    const tela = new PedidosPage(page);
    await tela.abrir();

    await tela.adicionarItem({
      fertilizante: 'Ureia',
      fazenda: 'Fazenda Boa Vista',
      pivo: 'Pivô 1',
      quantidade: 30,
    });

    await expect(tela.itensDoCarrinho).toHaveCount(1);
    await expect(tela.totalDoCarrinho).toContainText('1.500,00');

    await tela.emitirPedido();

    await expect(tela.mensagemSucesso).toContainText('emitido com sucesso');
    await expect(tela.itensDoCarrinho).toHaveCount(0);
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('70');
    const pedido = await primeiroPedido(request);
    await expect(tela.linhaDoPedido(pedido.id)).toContainText('pendente');

    const data = dataEmDias(5);
    await tela.agendarPedido(pedido.id, data);

    await expect(tela.mensagemSucesso).toContainText('agendado');
    await expect(tela.linhaDoPedido(pedido.id)).toContainText('agendado');
    await expect(tela.linhaDoPedido(pedido.id)).toContainText(data);
  });

  test('CT12 - bloqueio de pivô aparece na tela e a aplicação aérea é permitida', async ({
    page,
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100, { nome: 'Ureia' });
    const fazenda = await criarFazendaComPivos(request, { nome: 'Fazenda Boa Vista' });
    const pedidoExistente = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: fazenda.pivos[0] }),
    ]);
    expect(pedidoExistente.status()).toBe(201);

    const tela = new PedidosPage(page);
    await tela.abrir();
    await expect(tela.linhasDePedidos).toHaveCount(1);
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('90');

    await tela.adicionarItem({
      fertilizante: 'Ureia',
      fazenda: 'Fazenda Boa Vista',
      pivo: 'Pivô 2',
      quantidade: 10,
      tipo: 'Terrestre',
    });
    await tela.emitirPedido();

    await expect(tela.mensagemErro).toContainText('Pivô bloqueado');
    await expect(tela.linhasDePedidos).toHaveCount(1);
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('90');

    await tela.removerPrimeiroItem();
    await tela.adicionarItem({
      fertilizante: 'Ureia',
      fazenda: 'Fazenda Boa Vista',
      pivo: 'Pivô 2',
      quantidade: 10,
      tipo: 'Aérea',
    });
    await tela.emitirPedido();

    await expect(tela.mensagemSucesso).toContainText('emitido com sucesso');
    await expect(tela.linhasDePedidos).toHaveCount(2);
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('80');
  });

  test('CT09 - data de aplicação no passado exibe erro e mantém o pedido pendente', async ({
    page,
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const pedido = await (
      await emitirPedido(request, [montarItem({ fertilizante, fazenda })])
    ).json();
    const tela = new PedidosPage(page);
    await tela.abrir();

    await tela.agendarPedido(pedido.id, dataEmDias(-1));

    await expect(tela.mensagemErro).toContainText('passado');
    await expect(tela.linhaDoPedido(pedido.id)).toContainText('pendente');
  });

  test('CT05 - cancelar o pedido pela tela devolve o estoque', async ({ page, request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const pedido = await (
      await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 60 })])
    ).json();
    const tela = new PedidosPage(page);
    await tela.abrir();
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('40');

    await tela.cancelarPedido(pedido.id);

    await expect(tela.linhaDoPedido(pedido.id)).toContainText('cancelado');
    await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('100');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(100);
  });

  test('não emite pedido com carrinho vazio', async ({ page }) => {
    const tela = new PedidosPage(page);
    await tela.abrir();

    await tela.emitirPedido();

    await expect(tela.mensagemErro).toContainText('Adicione ao menos um item');
    await expect(tela.linhasDePedidos).toHaveCount(0);
  });
});

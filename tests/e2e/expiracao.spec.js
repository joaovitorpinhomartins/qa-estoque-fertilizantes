import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
  definirHoje,
} from '../fixtures/cenarios.js';
import { PedidosPage } from '../pages/PedidosPage.js';

test('CT13 - pedido com prazo vencido aparece cancelado na tela e o estoque volta', async ({
  page,
  request,
}) => {
  const fertilizante = await criarFertilizanteComEstoque(request, 100);
  const fazenda = await criarFazendaComPivos(request);
  await definirHoje(request, '2030-01-07');
  const pedido = await (
    await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 60 })])
  ).json();
  const tela = new PedidosPage(page);

  await tela.abrir();
  await expect(tela.linhaDoPedido(pedido.id)).toContainText('pendente');
  await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('40');

  await definirHoje(request, '2030-01-15');
  await page.reload();

  await expect(tela.linhaDoPedido(pedido.id)).toContainText('2030-01-07');
  await expect(tela.linhaDoPedido(pedido.id)).toContainText('cancelado (prazo vencido)');
  await expect(tela.saldoDoFertilizante(fertilizante.id)).toHaveText('100');
});

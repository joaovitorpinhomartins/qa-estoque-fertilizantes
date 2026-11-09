import { test, expect } from '../fixtures/index.js';
import {
  criarFertilizanteComEstoque,
  criarFazendaComPivos,
  montarItem,
  emitirPedido,
  buscarSaldo,
} from '../fixtures/cenarios.js';

test.describe('Emissão de pedido e controle de estoque', () => {
  test('CT05 - emite pedido dentro do saldo e reserva o estoque', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100, { preco: 50 });
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, quantidade: 30 }),
    ]);

    expect(resposta.status()).toBe(201);
    const pedido = await resposta.json();
    expect(pedido.status).toBe('pendente');
    expect(pedido.dataAplicacao).toBeNull();
    expect(pedido.total).toBe(1500);
    expect(await buscarSaldo(request, fertilizante.id)).toBe(70);
  });

  test('CT05 - aceita pedido com quantidade exatamente igual ao saldo', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 40);
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, quantidade: 40 }),
    ]);

    expect(resposta.status()).toBe(201);
    expect(await buscarSaldo(request, fertilizante.id)).toBe(0);
  });

  test('CT05 - rejeita pedido acima do saldo e não altera o estoque', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 40);
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, quantidade: 41 }),
    ]);

    expect(resposta.status()).toBe(422);
    expect((await resposta.json()).erro).toContain('Saldo insuficiente');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(40);
    expect(await (await request.get('/pedidos')).json()).toHaveLength(0);
  });

  test('CT05 - soma os itens do mesmo fertilizante ao validar o saldo', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 50);
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, quantidade: 30 }),
      montarItem({ fertilizante, fazenda, quantidade: 30, tipoAplicacao: 'aerea' }),
    ]);

    expect(resposta.status()).toBe(422);
    expect(await buscarSaldo(request, fertilizante.id)).toBe(50);
  });

  test('CT05 - cancelar o pedido devolve o estoque reservado', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const pedido = await (
      await emitirPedido(request, [montarItem({ fertilizante, fazenda, quantidade: 60 })])
    ).json();

    const resposta = await request.post(`/pedidos/${pedido.id}/cancelar`);

    expect(resposta.status()).toBe(200);
    expect((await resposta.json()).status).toBe('cancelado');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(100);
  });
});

test.describe('Bloqueio de pivô', () => {
  test('CT06 - bloqueia aplicação terrestre em outro pivô enquanto o pedido está pendente', async ({
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const [pivo1, pivo2] = fazenda.pivos;

    const primeiro = await emitirPedido(request, [montarItem({ fertilizante, fazenda, pivo: pivo1 })]);
    expect(primeiro.status()).toBe(201);

    const segundo = await emitirPedido(request, [montarItem({ fertilizante, fazenda, pivo: pivo2 })]);

    expect(segundo.status()).toBe(422);
    expect((await segundo.json()).erro).toContain('Pivô bloqueado');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(90);
  });

  test('CT06 - bloqueia dois pivôs terrestres dentro do mesmo pedido', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const [pivo1, pivo2] = fazenda.pivos;

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: pivo1 }),
      montarItem({ fertilizante, fazenda, pivo: pivo2 }),
    ]);

    expect(resposta.status()).toBe(422);
    expect(await buscarSaldo(request, fertilizante.id)).toBe(100);
  });

  test('CT06 - não bloqueia o mesmo pivô, outro fertilizante ou outra fazenda', async ({
    request,
  }) => {
    const ureia = await criarFertilizanteComEstoque(request, 100);
    const kcl = await criarFertilizanteComEstoque(request, 100);
    const fazenda1 = await criarFazendaComPivos(request);
    const fazenda2 = await criarFazendaComPivos(request);
    const [pivo1, pivo2] = fazenda1.pivos;

    await emitirPedido(request, [montarItem({ fertilizante: ureia, fazenda: fazenda1, pivo: pivo1 })]);

    const mesmoPivo = await emitirPedido(request, [
      montarItem({ fertilizante: ureia, fazenda: fazenda1, pivo: pivo1 }),
    ]);
    const outroFertilizante = await emitirPedido(request, [
      montarItem({ fertilizante: kcl, fazenda: fazenda1, pivo: pivo2 }),
    ]);
    const outraFazenda = await emitirPedido(request, [
      montarItem({ fertilizante: ureia, fazenda: fazenda2 }),
    ]);

    expect(mesmoPivo.status()).toBe(201);
    expect(outroFertilizante.status()).toBe(201);
    expect(outraFazenda.status()).toBe(201);
  });

  test('CT06 - libera o pivô quando o pedido pendente é cancelado', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const [pivo1, pivo2] = fazenda.pivos;
    const pedido = await (
      await emitirPedido(request, [montarItem({ fertilizante, fazenda, pivo: pivo1 })])
    ).json();
    await request.post(`/pedidos/${pedido.id}/cancelar`);

    const resposta = await emitirPedido(request, [montarItem({ fertilizante, fazenda, pivo: pivo2 })]);

    expect(resposta.status()).toBe(201);
  });

  test('CT07 - permite aplicação aérea em outro pivô apesar da terrestre pendente', async ({
    request,
  }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);
    const [pivo1, pivo2] = fazenda.pivos;
    await emitirPedido(request, [montarItem({ fertilizante, fazenda, pivo: pivo1 })]);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, pivo: pivo2, tipoAplicacao: 'aerea' }),
    ]);

    expect(resposta.status()).toBe(201);
    expect((await resposta.json()).itens[0].tipoAplicacao).toBe('aerea');
    expect(await buscarSaldo(request, fertilizante.id)).toBe(80);
  });
});

test.describe('Validação do pedido', () => {
  test('rejeita pedido sem itens', async ({ request }) => {
    const resposta = await emitirPedido(request, []);

    expect(resposta.status()).toBe(400);
    expect((await resposta.json()).erro).toBe('Informe ao menos um item');
  });

  test('rejeita tipo de aplicação inválido', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, tipoAplicacao: 'drone' }),
    ]);

    expect(resposta.status()).toBe(400);
    expect((await resposta.json()).erro).toBe('Tipo de aplicação inválido');
  });

  test('rejeita pivô que não pertence à fazenda informada', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda1 = await criarFazendaComPivos(request);
    const fazenda2 = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda: fazenda1, pivo: fazenda2.pivos[0] }),
    ]);

    expect(resposta.status()).toBe(400);
    expect((await resposta.json()).erro).toBe('Pivô não pertence à fazenda informada');
  });

  test('rejeita quantidade zero', async ({ request }) => {
    const fertilizante = await criarFertilizanteComEstoque(request, 100);
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante, fazenda, quantidade: 0 }),
    ]);

    expect(resposta.status()).toBe(400);
  });

  test('retorna 404 para fertilizante inexistente', async ({ request }) => {
    const fazenda = await criarFazendaComPivos(request);

    const resposta = await emitirPedido(request, [
      montarItem({ fertilizante: { id: 9999 }, fazenda }),
    ]);

    expect(resposta.status()).toBe(404);
  });
});

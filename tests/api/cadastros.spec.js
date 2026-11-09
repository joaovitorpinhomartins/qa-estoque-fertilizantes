import { test, expect } from '../fixtures/index.js';
import { gerarFertilizante, gerarFazenda } from '../fixtures/factories.js';

test.describe('Cadastro de fertilizantes', () => {
  test('CT01 - cadastra fertilizante válido com saldo inicial zero', async ({ request }) => {
    const dados = gerarFertilizante();

    const resposta = await request.post('/fertilizantes', { data: dados });

    expect(resposta.status()).toBe(201);
    const criado = await resposta.json();
    expect(criado).toMatchObject({ nome: dados.nome, preco: dados.preco, saldo: 0 });
    expect(criado.id).toEqual(expect.any(Number));

    const lista = await (await request.get('/fertilizantes')).json();
    expect(lista).toContainEqual(criado);
  });

  test('CT02 - rejeita fertilizante com nome duplicado, ignorando maiúsculas', async ({ request }) => {
    const dados = gerarFertilizante({ nome: 'Ureia Granulada' });
    await request.post('/fertilizantes', { data: dados });

    const resposta = await request.post('/fertilizantes', {
      data: { ...dados, nome: 'UREIA GRANULADA' },
    });

    expect(resposta.status()).toBe(409);
    expect(await resposta.json()).toEqual({ erro: 'Fertilizante já cadastrado' });

    const lista = await (await request.get('/fertilizantes')).json();
    expect(lista).toHaveLength(1);
  });

  const precosInvalidos = [
    ['zero', 0],
    ['negativo', -10],
    ['texto', 'caro'],
    ['ausente', undefined],
  ];

  for (const [descricao, preco] of precosInvalidos) {
    test(`CT02 - rejeita fertilizante com preço ${descricao}`, async ({ request }) => {
      const resposta = await request.post('/fertilizantes', {
        data: gerarFertilizante({ preco }),
      });

      expect(resposta.status()).toBe(400);
      expect(await resposta.json()).toEqual({ erro: 'Preço deve ser maior que zero' });
    });
  }

  test('CT02 - rejeita fertilizante sem nome', async ({ request }) => {
    const resposta = await request.post('/fertilizantes', {
      data: gerarFertilizante({ nome: '   ' }),
    });

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toEqual({ erro: 'Nome é obrigatório' });
  });
});

test.describe('Cadastro de fazendas', () => {
  test('CT03 - cadastra fazenda com dois pivôs e técnico responsável', async ({ request }) => {
    const dados = gerarFazenda();

    const resposta = await request.post('/fazendas', { data: dados });

    expect(resposta.status()).toBe(201);
    const criada = await resposta.json();
    expect(criada).toMatchObject({ nome: dados.nome, tecnico: dados.tecnico });
    expect(criada.pivos.map((p) => p.nome)).toEqual(['Pivô 1', 'Pivô 2']);
    for (const pivo of criada.pivos) {
      expect(pivo.id).toEqual(expect.any(Number));
    }

    const lista = await (await request.get('/fazendas')).json();
    expect(lista).toContainEqual(criada);
  });

  test('CT03 - rejeita fazenda sem pivôs', async ({ request }) => {
    const resposta = await request.post('/fazendas', { data: gerarFazenda({ pivos: [] }) });

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toEqual({ erro: 'Informe ao menos um pivô' });
  });

  test('CT03 - rejeita fazenda sem técnico responsável', async ({ request }) => {
    const resposta = await request.post('/fazendas', { data: gerarFazenda({ tecnico: '' }) });

    expect(resposta.status()).toBe(400);
    expect(await resposta.json()).toEqual({ erro: 'Técnico responsável é obrigatório' });
  });

  test('CT03 - rejeita fazenda com nome duplicado', async ({ request }) => {
    const dados = gerarFazenda();
    await request.post('/fazendas', { data: dados });

    const resposta = await request.post('/fazendas', { data: dados });

    expect(resposta.status()).toBe(409);
    expect(await resposta.json()).toEqual({ erro: 'Fazenda já cadastrada' });
  });
});

test.describe('Entrada de estoque', () => {
  test('CT04 - entradas sucessivas somam ao saldo do fertilizante', async ({ request }) => {
    const { id } = await (
      await request.post('/fertilizantes', { data: gerarFertilizante() })
    ).json();

    await request.post(`/fertilizantes/${id}/entrada`, { data: { quantidade: 50 } });
    const resposta = await request.post(`/fertilizantes/${id}/entrada`, {
      data: { quantidade: 30 },
    });

    expect(resposta.status()).toBe(200);
    expect((await resposta.json()).saldo).toBe(80);

    const lista = await (await request.get('/fertilizantes')).json();
    expect(lista.find((f) => f.id === id).saldo).toBe(80);
  });

  for (const quantidade of [0, -5]) {
    test(`CT04 - rejeita entrada de estoque com quantidade ${quantidade}`, async ({ request }) => {
      const { id } = await (
        await request.post('/fertilizantes', { data: gerarFertilizante() })
      ).json();

      const resposta = await request.post(`/fertilizantes/${id}/entrada`, {
        data: { quantidade },
      });

      expect(resposta.status()).toBe(400);

      const lista = await (await request.get('/fertilizantes')).json();
      expect(lista.find((f) => f.id === id).saldo).toBe(0);
    });
  }

  test('CT04 - retorna 404 para entrada em fertilizante inexistente', async ({ request }) => {
    const resposta = await request.post('/fertilizantes/9999/entrada', {
      data: { quantidade: 10 },
    });

    expect(resposta.status()).toBe(404);
  });
});

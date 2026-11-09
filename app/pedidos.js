import { db, nextId } from './store.js';
import { isPositiveNumber } from './validacao.js';

export const TIPOS_APLICACAO = ['terrestre', 'aerea'];

// Status em que o pedido ainda "ocupa" o pivô e o estoque reservado.
const STATUS_BLOQUEANTES = ['pendente', 'agendado'];

const arredondar = (valor) => Math.round(valor * 100) / 100;

// Passo 1: valida formato e referências de um item (erros 400/404).
function resolverItem(bruto) {
  if (!bruto || typeof bruto !== 'object') return { erro: [400, { erro: 'Item inválido' }] };

  const fertilizante = db.fertilizantes.find((f) => f.id === bruto.fertilizanteId);
  if (!fertilizante) return { erro: [404, { erro: 'Fertilizante não encontrado' }] };

  const fazenda = db.fazendas.find((f) => f.id === bruto.fazendaId);
  if (!fazenda) return { erro: [404, { erro: 'Fazenda não encontrada' }] };

  const pivo = fazenda.pivos.find((p) => p.id === bruto.pivoId);
  if (!pivo) return { erro: [400, { erro: 'Pivô não pertence à fazenda informada' }] };

  if (!isPositiveNumber(bruto.quantidade)) {
    return { erro: [400, { erro: 'Quantidade deve ser maior que zero' }] };
  }
  if (!TIPOS_APLICACAO.includes(bruto.tipoAplicacao)) {
    return { erro: [400, { erro: 'Tipo de aplicação inválido' }] };
  }

  return { fertilizante, fazenda, pivo, quantidade: bruto.quantidade, tipo: bruto.tipoAplicacao };
}

// Regra: aplicação terrestre do mesmo fertilizante, na mesma fazenda, em OUTRO pivô,
// é bloqueada enquanto houver pedido pendente. Aplicação aérea não é bloqueada.
function conflitaComPivo(existentes, novo) {
  if (novo.tipo !== 'terrestre') return false;
  return existentes.some(
    (i) =>
      i.tipoAplicacao === 'terrestre' &&
      i.fertilizanteId === novo.fertilizante.id &&
      i.fazendaId === novo.fazenda.id &&
      i.pivoId !== novo.pivo.id,
  );
}

export function criarPedido(body) {
  if (!Array.isArray(body.itens) || body.itens.length === 0) {
    return [400, { erro: 'Informe ao menos um item' }];
  }

  // Passo 1: validação de todos os itens antes de aplicar regras de negócio.
  const resolvidos = [];
  for (const bruto of body.itens) {
    const resultado = resolverItem(bruto);
    if (resultado.erro) return resultado.erro;
    resolvidos.push(resultado);
  }

  // Passo 2: regras de negócio (erro 422), considerando os itens do próprio pedido.
  const ativos = db.pedidos
    .filter((p) => STATUS_BLOQUEANTES.includes(p.status))
    .flatMap((p) => p.itens);
  const reservado = new Map();
  const itens = [];

  for (const r of resolvidos) {
    const jaReservado = reservado.get(r.fertilizante.id) ?? 0;
    if (jaReservado + r.quantidade > r.fertilizante.saldo) {
      return [422, { erro: `Saldo insuficiente para ${r.fertilizante.nome}` }];
    }
    if (conflitaComPivo([...ativos, ...itens], r)) {
      return [
        422,
        {
          erro:
            `Pivô bloqueado: já existe aplicação terrestre de ${r.fertilizante.nome} ` +
            `na fazenda ${r.fazenda.nome} em outro pivô. Use aplicação aérea.`,
        },
      ];
    }
    reservado.set(r.fertilizante.id, jaReservado + r.quantidade);
    itens.push({
      fertilizanteId: r.fertilizante.id,
      fazendaId: r.fazenda.id,
      pivoId: r.pivo.id,
      quantidade: r.quantidade,
      tipoAplicacao: r.tipo,
      precoUnitario: r.fertilizante.preco,
      subtotal: arredondar(r.fertilizante.preco * r.quantidade),
    });
  }

  // Passo 3: tudo válido, aplica (reserva de estoque e criação do pedido).
  for (const item of itens) {
    db.fertilizantes.find((f) => f.id === item.fertilizanteId).saldo -= item.quantidade;
  }
  const pedido = {
    id: nextId(),
    status: 'pendente',
    dataAplicacao: null,
    itens,
    total: arredondar(itens.reduce((soma, i) => soma + i.subtotal, 0)),
  };
  db.pedidos.push(pedido);
  return [201, pedido];
}

export function cancelarPedido(id) {
  const pedido = db.pedidos.find((p) => p.id === id);
  if (!pedido) return [404, { erro: 'Pedido não encontrado' }];
  if (pedido.status === 'cancelado') return [409, { erro: 'Pedido já cancelado' }];

  for (const item of pedido.itens) {
    db.fertilizantes.find((f) => f.id === item.fertilizanteId).saldo += item.quantidade;
  }
  pedido.status = 'cancelado';
  return [200, pedido];
}

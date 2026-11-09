import { db } from './store.js';

const arredondar = (valor) => Math.round(valor * 100) / 100;

// Demanda por fertilizante: considera todos os pedidos não cancelados.
// Ordenação: maior quantidade primeiro; empate resolvido pelo nome.
export function relatorioDemanda() {
  const porFertilizante = new Map();

  for (const pedido of db.pedidos.filter((p) => p.status !== 'cancelado')) {
    for (const item of pedido.itens) {
      const atual = porFertilizante.get(item.fertilizanteId) ?? {
        fertilizanteId: item.fertilizanteId,
        nome: db.fertilizantes.find((f) => f.id === item.fertilizanteId).nome,
        quantidadeTotal: 0,
        valorTotal: 0,
        pedidos: new Set(),
      };
      atual.quantidadeTotal += item.quantidade;
      atual.valorTotal += item.subtotal;
      atual.pedidos.add(pedido.id);
      porFertilizante.set(item.fertilizanteId, atual);
    }
  }

  return [...porFertilizante.values()]
    .map((r) => ({ ...r, valorTotal: arredondar(r.valorTotal), pedidos: r.pedidos.size }))
    .sort((a, b) => b.quantidadeTotal - a.quantidadeTotal || a.nome.localeCompare(b.nome));
}

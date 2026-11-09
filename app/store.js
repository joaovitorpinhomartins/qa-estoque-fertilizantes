// Armazenamento em memória. Simples de propósito: o foco do projeto são os testes.
let seq = 0;
export const nextId = () => ++seq;

export const db = {
  fertilizantes: [],
  fazendas: [],
  pedidos: [],
};

export function reset() {
  seq = 0;
  db.fertilizantes = [];
  db.fazendas = [];
  db.pedidos = [];
}

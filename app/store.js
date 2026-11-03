// Armazenamento em memória.
let seq = 0;
export const nextId = () => ++seq;

export const db = {
  fertilizantes: [],
  fazendas: [],
};

export function reset() {
  seq = 0;
  db.fertilizantes = [];
  db.fazendas = [];
}

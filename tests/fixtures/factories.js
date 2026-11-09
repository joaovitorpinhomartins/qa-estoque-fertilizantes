// Factories de massa de dados: cada chamada gera dados únicos e válidos.
// Use `overrides` para alterar só o campo que o cenário quer exercitar.
let contador = 0;
const proximo = () => ++contador;

export function gerarFertilizante(overrides = {}) {
  const n = proximo();
  return {
    nome: `Ureia ${n}`,
    preco: 120.5,
    ...overrides,
  };
}

export function gerarFazenda(overrides = {}) {
  const n = proximo();
  return {
    nome: `Fazenda ${n}`,
    tecnico: `Técnico ${n}`,
    pivos: ['Pivô 1', 'Pivô 2'],
    ...overrides,
  };
}

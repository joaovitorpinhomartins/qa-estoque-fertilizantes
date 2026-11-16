// Relógio da aplicação. Em testes, a data de "hoje" pode ser fixada (POST /test/relogio)
// para exercitar regras de prazo sem esperar dias de verdade.
let dataFixa = null;

const FORMATO_DATA = /^\d{4}-\d{2}-\d{2}$/;

export const formatarData = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const paraData = (texto) => {
  const [ano, mes, dia] = texto.split('-').map(Number);
  return new Date(ano, mes - 1, dia);
};

export function dataValida(texto) {
  if (typeof texto !== 'string' || !FORMATO_DATA.test(texto)) return false;
  const [ano, mes, dia] = texto.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
}

export const hoje = () => dataFixa ?? formatarData(new Date());

export function definirHoje(data) {
  if (!dataValida(data)) return false;
  dataFixa = data;
  return true;
}

export const restaurarRelogio = () => {
  dataFixa = null;
};

// Dias úteis (segunda a sexta, sem feriados) decorridos DEPOIS de `inicio`, até `fim` inclusive.
// O dia de início não conta.
export function diasUteisEntre(inicio, fim) {
  const cursor = paraData(inicio);
  const limite = paraData(fim);
  let total = 0;
  while (cursor < limite) {
    cursor.setDate(cursor.getDate() + 1);
    const diaDaSemana = cursor.getDay();
    if (diaDaSemana !== 0 && diaDaSemana !== 6) total++;
  }
  return total;
}

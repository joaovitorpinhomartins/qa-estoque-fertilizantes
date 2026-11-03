# QA Estoque de Fertilizantes

Projeto de portfólio de automação de testes (API + E2E) com **Playwright** e **JavaScript**,
sobre um sistema de gestão de estoque e aplicação de fertilizantes, com regras de negócio reais
do domínio (bloqueio de pivô, controle de saldo, agendamento de aplicação).

> Em construção. Os testes são adicionados em etapas.

## Como rodar

```bash
npm install
npx playwright install
npm test
npm run report
```

## Estrutura

- `app/`: API de exemplo (Node, sem dependências) usada como sistema sob teste
- `tests/api/`: testes de API
- `tests/e2e/`: testes de interface
- `tests/fixtures/`: massa de dados e factories
- `tests/pages/`: Page Objects
- `docs/`: estratégia de testes, riscos e decisões técnicas

## Regras de negócio cobertas (planejado)

1. Pedido não pode exceder o saldo em estoque
2. Bloqueio de pivô: mesmo fertilizante, mesma fazenda, aplicação terrestre em outro pivô é bloqueada
   enquanto houver pedido pendente, exceto aplicação aérea
3. Todo pedido emitido exige data de aplicação futura
4. Cadastros não aceitam duplicidade nem dados inválidos
5. Relatório ordena fertilizantes por demanda

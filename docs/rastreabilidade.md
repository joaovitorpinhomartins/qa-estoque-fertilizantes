# Rastreabilidade

Relação entre cenário, regra de negócio e onde está o teste.

| Cenário | Regra | Testes de API | Testes E2E |
|---|---|---|---|
| CT01 | Cadastro de fertilizante válido, com saldo inicial zero | `tests/api/cadastros.spec.js` | |
| CT02 | Fertilizante duplicado ou inválido é rejeitado | `tests/api/cadastros.spec.js` | |
| CT03 | Fazenda exige nome único, técnico e ao menos um pivô | `tests/api/cadastros.spec.js` | |
| CT04 | Entrada de estoque soma ao saldo e exige quantidade positiva | `tests/api/cadastros.spec.js` | |
| CT05 | Pedido não excede o saldo; emitir reserva e cancelar devolve o estoque | `tests/api/pedidos.spec.js` | `tests/e2e/pedidos.spec.js` (cancelamento) |
| CT06 | Bloqueio de pivô para aplicação terrestre | `tests/api/pedidos.spec.js`, `tests/api/agendamento.spec.js` | `tests/e2e/pedidos.spec.js` (CT12) |
| CT07 | Aplicação aérea não é bloqueada | `tests/api/pedidos.spec.js` | `tests/e2e/pedidos.spec.js` (CT12) |
| CT08 | Agendar data válida muda o status para agendado | `tests/api/agendamento.spec.js` | `tests/e2e/pedidos.spec.js` (CT11) |
| CT09 | Data inválida ou no passado e transições inválidas são rejeitadas | `tests/api/agendamento.spec.js` | `tests/e2e/pedidos.spec.js` |
| CT10 | Relatório de demanda ordenado e sem pedidos cancelados | `tests/api/relatorios.spec.js` | |
| CT11 | Fluxo completo pela tela: carrinho, pedido e agendamento | | `tests/e2e/pedidos.spec.js` |
| CT12 | Bloqueio exibido na tela e aplicação aérea aceita (integração API + tela) | | `tests/e2e/pedidos.spec.js` |

Os identificadores CT aparecem no título de cada teste, então é possível filtrar pelo relatório
ou rodar um grupo com `npx playwright test -g "CT06"`.

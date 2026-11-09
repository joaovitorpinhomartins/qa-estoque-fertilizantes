# Regras de negócio e decisões

## Regras implementadas

| Regra | Comportamento | Resposta |
|---|---|---|
| Saldo | A soma das quantidades pedidas de um fertilizante não pode exceder o saldo. Ao emitir, o estoque é reservado. | 422 |
| Bloqueio de pivô | Aplicação **terrestre** do mesmo fertilizante, na mesma fazenda, em **outro pivô** é bloqueada enquanto houver pedido pendente. | 422 |
| Aplicação aérea | Não sofre bloqueio de pivô. | 201 |
| Cancelamento | Devolve o estoque reservado e libera o bloqueio de pivô. | 200 |
| Agendamento | Pedido `pendente` recebe data de aplicação (AAAA-MM-DD) e passa a `agendado`. Data de hoje é aceita; data passada não. | 200 / 422 |
| Estados do pedido | Só pedido `pendente` pode ser agendado. Pedido `agendado` ou `cancelado` não pode ser agendado de novo. | 409 |
| Relatório de demanda | Soma quantidade, valor e nº de pedidos por fertilizante, ignorando cancelados, do mais ao menos demandado (desempate por nome). | 200 |

## Premissas (validar com o negócio)

- "Pendente" significa pedido emitido e não cancelado. Quando o agendamento for implementado, `agendado` também continua bloqueando.
- Repetir o mesmo pivô não é bloqueado.
- Pedido agendado continua bloqueando o pivô, igual ao pendente.
- Não é possível reagendar. Para mudar a data, cancela-se e emite-se de novo.
- O relatório considera pedidos pendentes e agendados, sem filtro de período.
- Um pedido com aplicação aérea pendente não bloqueia outro pivô terrestre.
- O sistema original tinha 3 tipos de aplicação. Aqui há 2 (terrestre e aérea), mantidos em lista configurável.

## Códigos de resposta

- 400: dados malformados ou inválidos
- 404: referência inexistente
- 409: conflito (duplicidade, cancelamento repetido)
- 422: regra de negócio violada

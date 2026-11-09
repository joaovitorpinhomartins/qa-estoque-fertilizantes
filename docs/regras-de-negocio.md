# Regras de negócio e decisões

## Regras implementadas

| Regra | Comportamento | Resposta |
|---|---|---|
| Saldo | A soma das quantidades pedidas de um fertilizante não pode exceder o saldo. Ao emitir, o estoque é reservado. | 422 |
| Bloqueio de pivô | Aplicação **terrestre** do mesmo fertilizante, na mesma fazenda, em **outro pivô** é bloqueada enquanto houver pedido pendente. | 422 |
| Aplicação aérea | Não sofre bloqueio de pivô. | 201 |
| Cancelamento | Devolve o estoque reservado e libera o bloqueio de pivô. | 200 |

## Premissas (validar com o negócio)

- "Pendente" significa pedido emitido e não cancelado. Quando o agendamento for implementado, `agendado` também continua bloqueando.
- Repetir o mesmo pivô não é bloqueado.
- Um pedido com aplicação aérea pendente não bloqueia outro pivô terrestre.
- O sistema original tinha 3 tipos de aplicação. Aqui há 2 (terrestre e aérea), mantidos em lista configurável.

## Códigos de resposta

- 400: dados malformados ou inválidos
- 404: referência inexistente
- 409: conflito (duplicidade, cancelamento repetido)
- 422: regra de negócio violada

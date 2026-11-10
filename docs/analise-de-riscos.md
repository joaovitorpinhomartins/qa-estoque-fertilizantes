# Análise de riscos

Avaliação por probabilidade e impacto de cada risco, com o que o projeto faz a respeito.
Os riscos sem cobertura estão listados de propósito: saber o que não está testado também faz parte da qualidade.

| ID | Risco | Prob. | Impacto | Como é tratado | Situação |
|---|---|---|---|---|---|
| R1 | Pedido acima do saldo, gerando estoque negativo | Alta | Alto | CT05: limite exato, saldo + 1, soma de itens do mesmo fertilizante | Coberto |
| R2 | Bloqueio de pivô não aplicado, permitindo a mesma aplicação em dois pivôs | Média | Alto | CT06 na API e CT12 na tela, inclusive com pedido agendado | Coberto |
| R3 | Bloqueio aplicado indevidamente (aérea, mesmo pivô, outro fertilizante, outra fazenda) | Média | Médio | CT06 e CT07 | Coberto |
| R4 | Cancelamento sem devolver o estoque ou sem liberar o pivô | Média | Alto | CT05 e CT06, na API e na tela | Coberto |
| R5 | Pedido gravado pela metade quando um item é inválido | Média | Alto | Rejeições conferem que saldo e pedidos não mudaram | Parcial |
| R6 | Data de aplicação inválida ou no passado aceita | Média | Médio | CT08 e CT09, incluindo valor-limite (hoje) | Coberto |
| R7 | Transição de estado inválida (reagendar, agendar cancelado) | Baixa | Médio | CT09 | Coberto |
| R8 | Relatório com números errados (por exemplo, contar pedidos cancelados) | Média | Alto | CT10: soma, exclusão de cancelados, ordenação, desempate | Parcial: sem filtro de período |
| R9 | Dois pedidos simultâneos consumindo o mesmo saldo | Média | Alto | Não testado. A API em memória atende uma requisição por vez, o que esconde o problema | **Não coberto** |
| R10 | Cadastros duplicados ou com dados inválidos | Média | Baixo | CT01 a CT04 | Coberto |
| R11 | Técnico acessando ou aprovando o que não deveria | Alta no sistema real | Alto | Controle de usuários fora do escopo | **Não coberto** |
| R12 | Regras implementadas com base em premissa errada | Alta | Médio | Premissas documentadas para validação com o negócio | Em aberto |
| R13 | Diferença de fuso entre cliente e servidor na regra "data no passado" | Baixa | Médio | Datas relativas a hoje. Risco residual perto da meia-noite | Parcial |
| R14 | Lentidão com muitos pedidos e fazendas | Baixa | Médio | Não testado. Previsto para um projeto de performance | **Não coberto** |

## Prioridade dos próximos testes
1. **R9 (concorrência)**: testar com chamadas paralelas ao endpoint de pedido.
2. **R12 (premissas)**: validar as premissas de `regras-de-negocio.md` com quem conhece o sistema.
3. **R8 (período do relatório)**: definir a regra e cobrir.
4. **R14 (performance)**: scripts em k6, com limites de p95 e taxa de erro.

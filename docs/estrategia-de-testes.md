# Estratégia de testes

## Objetivo
Dar confiança de que as regras de negócio do controle de estoque e da aplicação de fertilizantes
funcionam, e que continuam funcionando a cada alteração. O foco é o que custa caro quando falha:
estoque, bloqueio de pivô e relatório gerencial.

## Escopo

**Dentro do escopo**
- Cadastros de fertilizante e de fazenda (com pivôs e técnico responsável)
- Entrada de estoque
- Pedido: saldo, reserva de estoque e bloqueio de pivô
- Agendamento da data de aplicação e cancelamento
- Relatório de demanda por fertilizante
- Tela de pedido (carrinho, emissão, agendamento, cancelamento)

**Fora do escopo (por enquanto)**
- Controle de usuários e permissões
- Terceiro tipo de aplicação (o sistema original tinha 3; aqui há 2)
- Performance, segurança e acessibilidade completa
- Outros navegadores além do Chromium
- Concorrência entre pedidos simultâneos

## Abordagem em camadas

| Camada | Papel | Por quê |
|---|---|---|
| API (maioria dos testes) | Validar regras de negócio, validações e efeitos colaterais | Rápida, precisa e estável. Cada regra tem seu cenário positivo e negativo |
| E2E (poucos testes) | Validar caminhos críticos e a integração entre tela e API | Lento e mais frágil, então só o que precisa passar pela tela |

Os testes E2E montam os dados pela API e usam a tela apenas para o que ela faz. Isso reduz a
fragilidade e o tempo de execução.

## Técnicas aplicadas

- **Partição de equivalência e valor-limite**: quantidade igual ao saldo (aceita) e saldo + 1 (rejeitada);
  data de hoje (aceita) e de ontem (rejeitada); preço zero, negativo e texto.
- **Tabela de decisão** para o bloqueio de pivô:

| Tipo do novo item | Existente no pedido pendente | Mesmo fertilizante | Mesma fazenda | Mesmo pivô | Resultado |
|---|---|---|---|---|---|
| Terrestre | Terrestre | Sim | Sim | Não | **Bloqueia** |
| Terrestre | Terrestre | Sim | Sim | Sim | Permite |
| Terrestre | Terrestre | Não | Sim | Não | Permite |
| Terrestre | Terrestre | Sim | Não | Não | Permite |
| Aérea | Terrestre | Sim | Sim | Não | Permite |

- **Transição de estados** do pedido:
  - Válidas: pendente → agendado, pendente → cancelado, agendado → cancelado
  - Inválidas (testadas): agendar pedido cancelado, reagendar pedido agendado, cancelar duas vezes
- **Verificação de efeitos colaterais**: toda rejeição confere que o estoque e os pedidos não mudaram.

## Dados de teste
- Factories geram dados únicos e válidos. Cada teste altera só o campo que quer exercitar.
- Uma fixture automática zera a aplicação antes de cada teste, então os testes são independentes.
- Datas são sempre relativas a hoje, para a suíte não quebrar com o tempo.

## Execução
- Local: `npm test`, com relatório HTML em `npm run report`.
- CI: GitHub Actions a cada push e pull request, com o relatório publicado no GitHub Pages.
- Os testes rodam em série porque a aplicação guarda o estado em memória. Em CI há uma nova tentativa
  por teste, e o trace é guardado para investigar falhas.

## Critérios
- **Para aceitar uma mudança**: suíte verde no CI.
- **Para considerar uma regra coberta**: ao menos um cenário positivo, um negativo e a checagem do
  efeito colateral (ver `rastreabilidade.md`).

## Limitações e próximos passos
- Não há teste de concorrência (dois pedidos disputando o mesmo saldo).
- Não há teste de performance. Está previsto um repositório separado com k6.
- Algumas regras partem de premissas ainda não validadas com o negócio (ver `regras-de-negocio.md`).

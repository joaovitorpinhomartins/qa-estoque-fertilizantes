# QA Estoque de Fertilizantes

[![Testes](https://github.com/SEU-USUARIO/qa-estoque-fertilizantes/actions/workflows/testes.yml/badge.svg)](https://github.com/SEU-USUARIO/qa-estoque-fertilizantes/actions/workflows/testes.yml)
[Relatório mais recente dos testes](https://SEU-USUARIO.github.io/qa-estoque-fertilizantes/)

Projeto de portfólio de automação de testes (API + E2E) com **Playwright** e **JavaScript**,
sobre um sistema de gestão de estoque e aplicação de fertilizantes, com regras de negócio reais
do domínio: controle de saldo, **bloqueio de pivô**, agendamento da aplicação e relatório de demanda.

## Como rodar

```bash
npm install
npx playwright install
npm test            # API + E2E
npm run test:api    # só API
npm run test:e2e    # só interface
npm run report      # abre o relatório HTML
```

O Playwright sobe a aplicação automaticamente antes dos testes. Para usar a tela manualmente:
`npm start` e abra http://localhost:3000.

## O que é testado

| Camada | Cenários |
|---|---|
| API | Cadastros de fertilizante e fazenda, entrada de estoque, pedido, saldo, bloqueio de pivô, agendamento, cancelamento, relatório de demanda |
| E2E | Fluxo carrinho, pedido e agendamento; bloqueio de pivô exibido na tela; erro de data no passado; cancelamento devolvendo estoque; carrinho vazio |

## Documentação

- [Estratégia de testes](docs/estrategia-de-testes.md)
- [Análise de riscos](docs/analise-de-riscos.md)
- [Regras de negócio e premissas](docs/regras-de-negocio.md)
- [Rastreabilidade (cenário, regra e teste)](docs/rastreabilidade.md)

## Estrutura

- `app/`: sistema sob teste (API em Node sem dependências e tela HTML simples em `app/public/`)
- `tests/api/`: testes de API
- `tests/e2e/`: testes de interface
- `tests/pages/`: Page Objects
- `tests/fixtures/`: massa de dados (factories), helpers de cenário e limpeza automática entre testes
- `docs/`: estratégia de testes, riscos, regras de negócio e rastreabilidade
- `.github/workflows/`: pipeline de CI

## Decisões técnicas

- **Playwright para API e UI**: uma única ferramenta e uma única configuração.
- **Estado inicial via API**: os testes E2E montam os dados pela API e usam a tela só para o que ela faz.
- **Isolamento**: uma fixture automática zera os dados antes de cada teste.
- **Datas relativas a hoje**: a suíte não quebra com o passar do tempo.

import { expect } from '@playwright/test';

// Page Object da tela única do sistema: novo pedido, carrinho, estoque e pedidos.
export class PedidosPage {
  constructor(page) {
    this.page = page;
    this.fertilizante = page.getByLabel('Fertilizante', { exact: true });
    this.fazenda = page.getByLabel('Fazenda', { exact: true });
    this.pivo = page.getByLabel('Pivô', { exact: true });
    this.quantidade = page.getByLabel('Quantidade', { exact: true });
    this.tipo = page.getByLabel('Tipo de aplicação', { exact: true });
    this.botaoAdicionar = page.getByRole('button', { name: 'Adicionar ao carrinho' });
    this.botaoEmitir = page.getByRole('button', { name: 'Emitir pedido' });
    this.itensDoCarrinho = page.getByRole('table', { name: 'Carrinho' }).locator('tbody tr');
    this.linhasDePedidos = page.getByRole('table', { name: 'Pedidos' }).locator('tbody tr');
    this.totalDoCarrinho = page.getByTestId('total-carrinho');
    this.mensagemErro = page.getByRole('alert');
    this.mensagemSucesso = page.getByRole('status');
  }

  async abrir() {
    await this.page.goto('/');
    await expect(this.page.getByRole('heading', { name: 'Estoque de Fertilizantes' })).toBeVisible();
  }

  async adicionarItem({ fertilizante, fazenda, pivo, quantidade, tipo = 'Terrestre' }) {
    await this.fertilizante.selectOption({ label: fertilizante });
    await this.fazenda.selectOption({ label: fazenda });
    await this.pivo.selectOption({ label: pivo });
    await this.quantidade.fill(String(quantidade));
    await this.tipo.selectOption({ label: tipo });
    await this.botaoAdicionar.click();
  }

  async removerPrimeiroItem() {
    await this.itensDoCarrinho.first().getByRole('button', { name: 'Remover' }).click();
  }

  async emitirPedido() {
    await this.botaoEmitir.click();
  }

  linhaDoPedido(id) {
    return this.page.getByTestId(`pedido-${id}`);
  }

  saldoDoFertilizante(id) {
    return this.page.getByTestId(`saldo-${id}`);
  }

  async agendarPedido(id, data) {
    const linha = this.linhaDoPedido(id);
    await linha.getByLabel(`Data de aplicação do pedido ${id}`).fill(data);
    await linha.getByRole('button', { name: 'Agendar' }).click();
  }

  async cancelarPedido(id) {
    await this.linhaDoPedido(id).getByRole('button', { name: 'Cancelar' }).click();
  }
}

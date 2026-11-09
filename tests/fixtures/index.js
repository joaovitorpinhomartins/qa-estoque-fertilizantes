import { test as base, expect } from '@playwright/test';

// Fixture automática: antes de cada teste a API volta ao estado vazio,
// garantindo que os cenários não dependam uns dos outros.
export const test = base.extend({
  dadosLimpos: [
    async ({ request }, use) => {
      const resposta = await request.post('/test/reset');
      expect(resposta.status()).toBe(204);
      await use();
    },
    { auto: true },
  ],
});

export { expect };

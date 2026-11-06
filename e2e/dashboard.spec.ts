import { expect, test, type APIRequestContext } from '@playwright/test'
import { API_URL, createVerifiedAccount, login, PASSWORD, uniqueEmail } from './helpers'

/** Dix montres par l'API : neuf Orient (M01 à M09, achetées 100 € à 108 €) et une Zenith sans prix d'achat. */
async function seedTenWatches(request: APIRequestContext, email: string): Promise<void> {
  const session = await request.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } })
  expect(session.status()).toBe(200)
  const { accessToken } = (await session.json()) as { accessToken: string }
  const headers = { Authorization: `Bearer ${accessToken}` }

  for (let i = 1; i <= 9; i++) {
    const created = await request.post(`${API_URL}/watches`, {
      headers,
      data: {
        brand: 'Orient',
        model: `M0${i}`,
        movementCode: 'manual',
        purchasePrice: String(99 + i),
        purchaseDate: `2025-0${i}-01`,
        steps: [{ label: 'Ouvrir le boîtier' }],
      },
    })
    expect(created.status()).toBe(201)
  }
  const last = await request.post(`${API_URL}/watches`, {
    headers,
    data: { brand: 'Zenith', model: 'El Primero', movementCode: 'automatic', steps: [{ label: 'Ouvrir le boîtier' }] },
  })
  expect(last.status()).toBe(201)
}

test('desktop : tuiles, pagination par 8, recherche et tri sur l’achat', async ({ page, request }) => {
  const email = uniqueEmail('dashboard')
  await createVerifiedAccount(request, email)
  await seedTenWatches(request, email)
  await login(page, email)

  await expect(page.locator('[data-test="stat"]')).toHaveCount(6)
  await expect(page.locator('[data-test="stat"]').filter({ hasText: 'Montres' }).first()).toContainText('10')
  await expect(page.locator('[data-test="stat"]').filter({ hasText: 'Marge cumulée' })).toBeVisible()

  await expect(page.locator('[data-test="table-row"]')).toHaveCount(8)
  await expect(page.locator('[data-test="range"]')).toHaveText('1–8 sur 10')
  await page.locator('[data-test="page-next"]').click()
  await expect(page.locator('[data-test="range"]')).toHaveText('9–10 sur 10')
  await expect(page.locator('[data-test="table-row"]')).toHaveCount(2)

  await page.getByRole('searchbox', { name: 'Rechercher une montre' }).fill('zénith')
  await expect(page.locator('[data-test="table-row"]')).toHaveCount(1)
  await expect(page.locator('[data-test="table-row"]')).toContainText('El Primero')
  await expect(page.locator('[data-test="table-row"]')).toContainText('Inconnu')
  await expect(page.locator('[data-test="range"]')).toHaveText('1–1 sur 1')

  await page.getByRole('searchbox', { name: 'Rechercher une montre' }).fill('')
  await expect(page.locator('[data-test="table-row"]')).toHaveCount(8)
  const achat = page.locator('th[aria-sort]')
  await expect(achat).toHaveAttribute('aria-sort', 'none')
  await page.locator('[data-test="sort-purchase"]').click()
  await expect(achat).toHaveAttribute('aria-sort', 'descending')
  await expect(page.locator('[data-test="table-row"]').first()).toContainText('M09')
  await page.locator('[data-test="sort-purchase"]').click()
  await expect(achat).toHaveAttribute('aria-sort', 'ascending')
  await expect(page.locator('[data-test="table-row"]').first()).toContainText('M01')
})

test('mobile 390 px : « Voir plus » charge la suite et le lien Recherche focalise le champ', async ({ page, request }) => {
  const email = uniqueEmail('dashboard-mobile')
  await createVerifiedAccount(request, email)
  await seedTenWatches(request, email)
  await page.setViewportSize({ width: 390, height: 800 })
  await login(page, email)

  await expect(page.locator('[data-test="watch-card"]')).toHaveCount(8)
  await page.getByRole('button', { name: 'Voir plus' }).click()
  await expect(page.locator('[data-test="watch-card"]')).toHaveCount(10)
  await expect(page.getByRole('button', { name: 'Voir plus' })).toHaveCount(0)

  await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Recherche' }).click()
  await expect(page.getByRole('searchbox', { name: 'Rechercher une montre' })).toBeFocused()
})

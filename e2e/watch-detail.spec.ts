import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import { API_URL, createVerifiedAccount, login, PASSWORD, today, uniqueEmail } from './helpers'

/** Crée une montre achetée 120 € par l'API et renvoie son identifiant. */
async function createWatch(request: APIRequestContext, email: string): Promise<number> {
  const session = await request.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } })
  expect(session.status()).toBe(200)
  const { accessToken } = (await session.json()) as { accessToken: string }
  const created = await request.post(`${API_URL}/watches`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: {
      brand: 'Seiko',
      model: '6119-8100',
      movementCode: 'automatic',
      purchasePrice: '120',
      purchaseDate: '2025-03-01',
      steps: [{ label: 'Désarmer le ressort' }, { label: 'Sortir le mouvement' }, { label: 'Déposer les aiguilles' }],
    },
  })
  expect(created.status()).toBe(201)
  return ((await created.json()) as { id: number }).id
}

const fact = (page: Page, label: string) => page.locator('[data-test="fact"]').filter({ has: page.locator('dt', { hasText: label }) }).locator('dd')

test('fiche montre desktop : bandeau, coût de revient, mesure et verdict, modification', async ({ page, request }) => {
  const email = uniqueEmail('detail')
  await createVerifiedAccount(request, email)
  const id = await createWatch(request, email)
  await login(page, email)
  await page.goto(`/watches/${id}`)

  // Fil d'Ariane et bandeau de faits.
  await expect(page.getByRole('navigation', { name: 'Fil d’Ariane' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Seiko 6119-8100' })).toBeVisible()
  await expect(fact(page, 'Achat')).toContainText('120 €')
  await expect(fact(page, 'Coût de revient')).toHaveText('120 €')
  await expect(fact(page, 'Progression')).toHaveText('0/3')

  // Un coût de 45 € : le coût de revient passe à 165 €.
  await page.locator('[data-test="expense-add"]').click()
  await page.locator('[data-test="e-label"]').fill('Joint de fond')
  await page.locator('[data-test="e-amount"]').fill('45')
  await page.locator('[data-test="e-date"]').fill(today())
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('[data-test="expenses-total"]')).toContainText('45 €')
  await expect(fact(page, 'Coût de revient')).toHaveText('165 €')
  await expect(page.locator('[data-test="cost-price"]')).toHaveText('165 €')

  // Une mesure hors zone en marche, dans la zone ailleurs : les verdicts de la maquette.
  await page.locator('[data-test="measurement-add"]').click()
  await page.locator('[data-test="m-date"]').fill(today())
  await page.locator('[data-test="m-rate"]').fill('14')
  await page.locator('[data-test="m-beat"]').fill('0.4')
  await page.locator('[data-test="m-amp"]').fill('268')
  await page.getByRole('button', { name: 'Enregistrer la mesure' }).click()
  await expect(page.locator('[data-test="scale-verdict"]')).toHaveText([
    'Avance de 14 s/j · hors zone (±10 s/j)',
    'Dans la zone (≤ 0.5 ms)',
    'Dans la zone (250–310°)',
  ])
  await expect(fact(page, 'Dernière mesure')).toHaveText('+14 s/j')

  // Modifier la montre : le nouveau modèle apparaît sur la fiche.
  await page.getByRole('link', { name: 'Modifier la montre' }).click()
  await expect(page).toHaveURL(new RegExp(`/watches/${id}/edit$`))
  await page.getByLabel('Modèle').fill('6119-8100 B')
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page).toHaveURL(new RegExp(`/watches/${id}$`))
  await expect(page.getByRole('heading', { name: 'Seiko 6119-8100 B' })).toBeVisible()
})

test.describe('fiche montre mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('finances avant les étapes, menu « ⋯ » et suppression de la montre', async ({ page, request }) => {
    const email = uniqueEmail('detail-mobile')
    await createVerifiedAccount(request, email)
    const id = await createWatch(request, email)
    await login(page, email)
    await page.goto(`/watches/${id}`)

    // Ordre de la maquette mobile : Finances, puis la checklist.
    const finances = await page.getByRole('heading', { name: 'Finances' }).boundingBox()
    const checklist = await page.getByRole('heading', { name: 'Checklist de restauration' }).boundingBox()
    expect(finances!.y).toBeLessThan(checklist!.y)

    // Le bouton « Marquer le projet terminé » et son hint sont dans l'en-tête.
    await expect(page.getByRole('button', { name: 'Marquer le projet terminé' })).toBeVisible()
    await expect(page.getByText('Passe le projet au statut Terminé')).toBeVisible()

    await page.locator('[data-test="menu-toggle"]').click()
    await expect(page.getByRole('menuitem', { name: 'Rouvrir ce projet' })).toHaveAttribute('aria-disabled', 'true')
    await page.getByRole('menuitem', { name: 'Supprimer la montre' }).click()
    await page.locator('[data-test="confirm-ok"]').click()

    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
  })
})

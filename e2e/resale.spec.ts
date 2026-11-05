import { expect, test } from '@playwright/test'
import { createVerifiedAccount, login, today, uniqueEmail } from './helpers'

test('S21 + S22 + S23 : coût de 40 €, projet terminé, revente à 200 €, achat à 80 € : marge de 80 €', async ({ page, request }) => {
  const email = uniqueEmail('resale')
  await createVerifiedAccount(request, email)
  await login(page, email)

  await page
    .getByRole('link', { name: /Nouvelle montre|Créez votre première montre/ })
    .first()
    .click()
  await page.getByLabel('Marque').fill('Orient')
  await page.getByLabel('Modèle').fill('Bambino')
  await page.getByLabel(/Prix d’achat/).fill('80')
  await page.getByRole('button', { name: 'Voir les étapes proposées' }).click()
  await page.getByRole('button', { name: 'Créer le projet' }).click()
  await page.getByRole('link', { name: 'Voir la fiche de la montre' }).click()

  // S21 : un coût de 40 €.
  await page.locator('[data-test="expense-add"]').click()
  await page.locator('[data-test="e-label"]').fill('Joint de fond')
  await page.locator('[data-test="e-amount"]').fill('40')
  await page.locator('[data-test="e-date"]').fill(today())
  await page.getByRole('button', { name: 'Enregistrer' }).click()
  await expect(page.locator('[data-test="expenses-total"]')).toContainText('40,00')

  // S22 : la revente exige un projet terminé.
  await page.getByRole('button', { name: 'Terminer le projet' }).click()
  await expect(page.getByRole('heading', { name: 'Terminé' })).toBeVisible()
  await page.locator('[data-test="resale-open"]').click()
  await page.locator('[data-test="resale-price"]').fill('200')
  await page.locator('[data-test="resale-date"]').fill(today())
  await page.getByRole('button', { name: 'Enregistrer' }).click()

  // S23 : 200 − 80 − 40 = 80.
  await expect(page.locator('[data-test="margin"]')).toContainText('80,00')
  await page.reload()
  await expect(page.locator('[data-test="margin"]')).toContainText('80,00')
})

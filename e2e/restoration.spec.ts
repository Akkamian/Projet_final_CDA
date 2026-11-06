import { expect, test } from '@playwright/test'
import { createVerifiedAccount, login, PNG_1X1, uniqueEmail } from './helpers'

test('S5 + S12 + S17 : montre manuelle avec chronographe et date, étape validée, photo ajoutée', async ({ page, request }) => {
  const email = uniqueEmail('resto')
  await createVerifiedAccount(request, email)
  await login(page, email)

  await page
    .getByRole('link', { name: /Nouvelle montre|Créez votre première montre/ })
    .first()
    .click()
  await page.getByLabel('Marque').fill('Seiko')
  await page.getByLabel('Modèle').fill('6139-6002')
  await page.getByLabel('Mécanique à remontage manuel').check()
  await page.getByLabel('Chronographe').check()
  await page.getByLabel('Date', { exact: true }).check()
  await page.getByRole('button', { name: 'Voir les étapes proposées' }).click()

  // S5 : les étapes du référentiel pour ce mouvement et ces complications (30).
  await expect(page.getByRole('heading', { name: /Étapes proposées \(30\)/ })).toBeVisible()
  await page.getByRole('button', { name: 'Créer le projet' }).click()
  await expect(page.getByRole('heading', { name: 'Montre créée' })).toBeVisible()
  await page.getByRole('link', { name: 'Voir la fiche de la montre' }).click()
  await expect(page.getByRole('heading', { name: 'Seiko 6139-6002' })).toBeVisible()
  await expect(page.locator('[data-test="step"]')).toHaveCount(30)

  // S12 : valider une étape.
  const first = page.locator('[data-test="step"]').first()
  await first.locator('input[type="checkbox"]').check()
  await expect(first.locator('input[type="checkbox"]')).toBeChecked()
  await page.reload()
  await expect(page.locator('[data-test="step"]').first().locator('input[type="checkbox"]')).toBeChecked()

  // S17 : ajouter une photo à une étape.
  await page
    .locator('[data-test="step"]')
    .first()
    .locator('[data-test="photo-input"]')
    .setInputFiles({ name: 'etape.png', mimeType: 'image/png', buffer: PNG_1X1 })
  await expect(page.locator('[data-test="photo"]')).toHaveCount(1)
  await page.reload()
  await expect(page.locator('[data-test="photo"]')).toHaveCount(1)
})

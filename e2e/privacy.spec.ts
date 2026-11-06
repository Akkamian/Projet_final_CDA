import { expect, test } from '@playwright/test'
import { createVerifiedAccount, login, uniqueEmail } from './helpers'

test('S27 : un second utilisateur ne voit pas la montre du premier (introuvable)', async ({ browser, request }) => {
  const owner = uniqueEmail('owner')
  const other = uniqueEmail('other')
  await createVerifiedAccount(request, owner)
  await createVerifiedAccount(request, other)

  const ownerPage = await (await browser.newContext()).newPage()
  await login(ownerPage, owner)
  await ownerPage
    .getByRole('link', { name: /Nouvelle montre|Créez votre première montre/ })
    .first()
    .click()
  await ownerPage.getByLabel('Marque').fill('Citizen')
  await ownerPage.getByLabel('Modèle').fill('Promaster')
  await ownerPage.getByRole('button', { name: 'Voir les étapes proposées' }).click()
  await ownerPage.getByRole('button', { name: 'Créer le projet' }).click()
  await ownerPage.getByRole('link', { name: 'Voir la fiche de la montre' }).click()
  await expect(ownerPage.getByRole('heading', { name: 'Citizen Promaster' })).toBeVisible()
  const watchUrl = ownerPage.url()

  const otherPage = await (await browser.newContext()).newPage()
  await login(otherPage, other)
  await expect(otherPage.getByText('Citizen')).toHaveCount(0)
  await otherPage.goto(watchUrl)
  await expect(otherPage.getByRole('alert')).toContainText('introuvable')
  await expect(otherPage.getByText('Citizen')).toHaveCount(0)
})

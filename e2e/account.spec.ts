import { expect, test } from '@playwright/test'
import { API_URL, createVerifiedAccount, login, PASSWORD, uniqueEmail } from './helpers'

const NEW_PASSWORD = 'nouveau-mdp-e2e-2'

test('changer son mot de passe depuis la feuille, puis se reconnecter avec le nouveau', async ({ page, request }) => {
  const email = uniqueEmail('account-password')
  await createVerifiedAccount(request, email)
  await login(page, email)
  await page.goto('/account')

  await expect(page.locator('main [data-test="account-email"]')).toHaveText(email)
  await expect(page.locator('[data-test="password-changed-at"]')).toContainText('Jamais modifié')

  await page.getByRole('button', { name: 'Modifier', exact: true }).click()
  const sheet = page.locator('dialog.sheet')
  await sheet.getByLabel('Mot de passe actuel').fill(PASSWORD)
  await sheet.getByLabel('Nouveau mot de passe', { exact: true }).fill(NEW_PASSWORD)
  await sheet.getByLabel('Confirmer le nouveau mot de passe').fill(NEW_PASSWORD)
  await sheet.getByRole('button', { name: 'Modifier le mot de passe' }).click()

  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(page.getByRole('status')).toContainText('Mot de passe modifié')
  await expect(page.locator('[data-test="password-changed-at"]')).not.toContainText('Jamais modifié')

  await page.getByRole('button', { name: 'Se déconnecter' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(NEW_PASSWORD)
  await page.getByRole('button', { name: 'Connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
})

test('les statistiques du compte comptent les montres créées', async ({ page, request }) => {
  const email = uniqueEmail('account-stats')
  await createVerifiedAccount(request, email)
  const session = await request.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } })
  const { accessToken } = (await session.json()) as { accessToken: string }
  const created = await request.post(`${API_URL}/watches`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    data: { brand: 'Seiko', model: '6119', movementCode: 'automatic', steps: [{ label: 'Désarmer' }] },
  })
  expect(created.status()).toBe(201)

  await login(page, email)
  await page.goto('/account')

  await expect(page.locator('[data-test="stat-total"]')).toHaveText('1')
  await expect(page.locator('[data-test="stat-in-progress"]')).toHaveText('1')
  await expect(page.locator('[data-test="stat-sold"]')).toHaveText('0')
})

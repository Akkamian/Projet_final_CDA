import { expect, test } from '@playwright/test'
import { createVerifiedAccount, login, uniqueEmail } from './helpers'

test('desktop : la barre latérale porte les trois entrées et l’email, Mon compte ouvre l’écran compte', async ({ page, request }) => {
  const email = uniqueEmail('shell')
  await createVerifiedAccount(request, email)
  await login(page, email)

  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav.getByRole('link', { name: 'Tableau de bord' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Recherche' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Mon compte' })).toBeVisible()
  await expect(nav.getByText(email)).toBeVisible()

  await nav.getByRole('link', { name: 'Mon compte' }).click()
  await expect(page).toHaveURL(/\/account$/)
  await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible()
})

test('mobile 390 px : la barre du bas remplace la barre latérale et Nouveau projet ouvre le formulaire', async ({ page, request }) => {
  const email = uniqueEmail('shell-mobile')
  await createVerifiedAccount(request, email)
  await page.setViewportSize({ width: 390, height: 800 })
  await login(page, email)

  const nav = page.getByRole('navigation', { name: 'Navigation principale' })
  await expect(nav).toHaveCount(1)
  await expect(nav.getByRole('link', { name: 'Accueil' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Recherche' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Nouveau projet' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Mon compte' })).toHaveCount(0)

  await nav.getByRole('link', { name: 'Nouveau projet' }).click()
  await expect(page).toHaveURL(/\/watches\/new$/)
})

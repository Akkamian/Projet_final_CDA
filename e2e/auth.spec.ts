import { expect, test } from '@playwright/test'
import { createVerifiedAccount, PASSWORD, readLastEmailLink, uniqueEmail } from './helpers'

test('S1 + S2 + connexion : inscription, connexion refusée tant que l’adresse n’est pas vérifiée, lien reçu, connexion', async ({
  page,
}) => {
  const email = uniqueEmail('auth')

  await page.goto('/register')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
  await page.getByLabel('Confirmation du mot de passe').fill(PASSWORD)
  await page.getByLabel(/J’ai lu et j’accepte/).check()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByRole('heading', { name: 'Vérifiez votre boîte mail' })).toBeVisible()

  // S2 : tant que l'adresse n'est pas vérifiée, la connexion est refusée avec un message distinct.
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Connexion' }).click()
  await expect(page.getByRole('alert')).toContainText('pas encore vérifiée')
  // Bannière d'avertissement ambre (--warning), pas le rouge des erreurs : `.alert` ne doit pas l'emporter sur `.banner-warning`.
  await expect(page.locator('.banner-warning')).toHaveCSS('border-top-color', 'rgb(201, 154, 62)')

  // Le lien est lu dans MailDev, comme le ferait l'utilisateur.
  await page.goto(await readLastEmailLink(email))
  await expect(page.getByRole('heading', { name: 'Adresse vérifiée' })).toBeVisible()

  await page.getByRole('link', { name: 'Connexion' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
  await page.getByRole('button', { name: 'Connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
})

test('S3 : mot de passe oublié, lien reçu dans MailDev, nouveau mot de passe, connexion', async ({ page, request }) => {
  const email = uniqueEmail('reset')
  await createVerifiedAccount(request, email)

  await page.goto('/login')
  await page.getByRole('link', { name: 'Mot de passe oublié ?' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByRole('button', { name: 'Envoyer le lien' }).click()
  await expect(page.getByRole('status')).toContainText('Si cette adresse correspond à un compte')

  await page.goto(await readLastEmailLink(email))
  await page.getByLabel('Nouveau mot de passe').fill('nouveau-mdp-e2e-1')
  await page.getByLabel('Confirmation du mot de passe').fill('nouveau-mdp-e2e-1')
  await page.getByRole('button', { name: 'Modifier le mot de passe' }).click()
  await expect(page.getByRole('heading', { name: 'Mot de passe modifié' })).toBeVisible()

  await page.getByRole('link', { name: 'Connexion' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill('nouveau-mdp-e2e-1')
  await page.getByRole('button', { name: 'Connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
})

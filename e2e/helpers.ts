import { expect, type APIRequestContext, type Page } from '@playwright/test'

export const API_URL = 'http://localhost:3200'
const MAILDEV_URL = 'http://localhost:1080'
export const PASSWORD = 'motdepasse-e2e-1'

/** Adresse unique par parcours : la base n'est remise à neuf qu'au lancement, MailDev jamais. */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@e2e.test`
}

/** Premier lien de l'email le plus récent reçu par `to`, lu par l'API HTTP de MailDev (attend jusqu'à 10 s). */
export async function readLastEmailLink(to: string): Promise<string> {
  const deadline = Date.now() + 10_000
  for (;;) {
    const emails = (await (await fetch(`${MAILDEV_URL}/email`)).json()) as { to: { address: string }[]; text: string; time: string }[]
    const mine = emails.filter((e) => e.to.some((t) => t.address === to)).sort((a, b) => b.time.localeCompare(a.time))
    const link = mine[0] && /https?:\/\/\S+/.exec(mine[0].text)?.[0]
    if (link) return link
    if (Date.now() > deadline) throw new Error(`Aucun email avec un lien reçu pour ${to}`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}

/** Crée un compte vérifié sans passer par l'écran (le parcours d'inscription a son propre test). */
export async function createVerifiedAccount(request: APIRequestContext, email: string): Promise<void> {
  const register = await request.post(`${API_URL}/auth/register`, { data: { email, password: PASSWORD, acceptTerms: true } })
  expect(register.status()).toBe(201)
  const token = new URL(await readLastEmailLink(email)).searchParams.get('token')
  const verify = await request.post(`${API_URL}/auth/verify-email`, { data: { token } })
  expect(verify.status()).toBe(204)
}

export async function login(page: Page, email: string): Promise<void> {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(PASSWORD)
  await page.getByRole('button', { name: 'Connexion' }).click()
  await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()
}

/** Jour local AAAA-MM-JJ : les formulaires de coût et de revente n'ont pas de date par défaut. */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Petit PNG valide (1×1) pour les envois de photo. */
export const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

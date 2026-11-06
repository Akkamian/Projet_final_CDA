import { expect, test } from '@playwright/test'
import { API_URL, createVerifiedAccount, login, PASSWORD, uniqueEmail } from './helpers'

// Ces comportements ne se voient que dans un vrai navigateur (hauteur résolue, inertie d'un dialog modal), pas sous jsdom.
test.use({ viewport: { width: 375, height: 560 } })

test('feuille mobile sur petit écran : le pied reste visible, le corps défile, le focus revient au crayon', async ({ page, request }) => {
  const email = uniqueEmail('sheet-small')
  await createVerifiedAccount(request, email)
  const session = await request.post(`${API_URL}/auth/login`, { data: { email, password: PASSWORD } })
  const { accessToken } = (await session.json()) as { accessToken: string }
  const headers = { Authorization: `Bearer ${accessToken}` }
  const created = await request.post(`${API_URL}/watches`, {
    headers,
    data: { brand: 'Seiko', model: '6119', movementCode: 'automatic', steps: [{ label: 'Désarmer' }] },
  })
  const watch = (await created.json()) as { id: number; projects: { id: number }[] }
  await request.post(`${API_URL}/projects/${watch.projects[0]!.id}/measurements`, {
    headers,
    data: { measuredAt: '2026-09-06', rateSecondsPerDay: 14, beatErrorMs: 0.4, amplitudeDegrees: 268, watchPosition: 'Cadran haut' },
  })
  await login(page, email)
  await page.goto(`/watches/${watch.id}`)
  const pencil = page.getByRole('button', { name: /Modifier la mesure du/ })
  await pencil.click()

  const footer = page.locator('dialog.sheet .sheet-footer')
  await expect(footer).toBeVisible()
  const box = (await footer.boundingBox())!
  expect(box.y + box.height).toBeLessThanOrEqual(560 + 1)
  expect(await page.locator('dialog.sheet .sheet-body').evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true)

  // Échap ferme la feuille et rend le focus au crayon qui l'a ouverte ; sans la fermeture explicite, il tombait sur le corps de la page.
  await page.keyboard.press('Escape')
  await expect(page.locator('dialog')).toHaveCount(0)
  await expect(pencil).toBeFocused()
})

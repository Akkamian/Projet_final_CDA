/** Le jour local au format AAAA-MM-JJ (RG-GEN-01 : aucune date dans le futur) ; `toISOString` donnerait le jour UTC. */
export function today(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Message d'une erreur d'écriture (celui de l'API quand elle en donne un). */
export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : 'L’opération a échoué. Réessayez dans un instant.'
}

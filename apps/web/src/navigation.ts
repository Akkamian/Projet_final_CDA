/** « Tableau de bord » (barre latérale) et « Accueil » (barre du bas) restent actifs sur les fiches et l'écran Nouveau projet. */
export function isHomeActive(path: string): boolean {
  return path === '/' || path.startsWith('/watches')
}

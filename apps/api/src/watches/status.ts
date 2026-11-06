export type ProjectStatus = 'in_progress' | 'completed';
export type DashboardStatus = ProjectStatus | 'sold' | 'no_project';

export const DASHBOARD_STATUSES: readonly DashboardStatus[] = ['in_progress', 'completed', 'sold', 'no_project'];

/** Statut affiché au tableau de bord : « vendue » prime sur le projet (RG-AFF-02), sans projet = no_project (RG-AFF-05). */
export function computeStatus(watch: { resaleDate: string | null; latestProjectStatus: ProjectStatus | null }): DashboardStatus {
  if (watch.resaleDate !== null) return 'sold';
  return watch.latestProjectStatus ?? 'no_project';
}

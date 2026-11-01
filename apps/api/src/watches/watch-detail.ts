import type { Prisma } from '../generated/prisma/client.js';

export interface StepDetail {
  id: number;
  stepOrder: number;
  label: string;
  notes: string | null;
  isCompleted: boolean;
  completedAt: string | null;
  photos: { id: number; url: string }[];
}

export interface ProjectDetail {
  id: number;
  status: 'in_progress' | 'completed';
  createdAt: string;
  completedAt: string | null;
  photoBefore: string | null;
  photoAfter: string | null;
  steps: StepDetail[];
  measurements: never[];
  expenses: never[];
}

export interface WatchDetail {
  id: number;
  brand: string;
  model: string;
  movementCode: 'manual' | 'automatic';
  complications: { code: string; label: string }[];
  purchasePrice: string | null;
  purchaseDate: string | null;
  resalePrice: string | null;
  resaleDate: string | null;
  margin: string | null;
  projects: ProjectDetail[];
}

export const WATCH_DETAIL_INCLUDE = {
  comporte: { include: { complications: true } },
  restoration_projects: { include: { restoration_steps: { orderBy: { step_order: 'asc' } } } },
} satisfies Prisma.watchesInclude;

export type WatchWithDetail = Prisma.watchesGetPayload<{ include: typeof WATCH_DETAIL_INCLUDE }>;

const day = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 10) : null);
const money = (amount: Prisma.Decimal | null): string | null => (amount ? amount.toFixed(2) : null);

/**
 * Forme renvoyée par l'API pour une montre.
 * Tâche 14 : seule la création l'utilise, sur une montre neuve. Mesures, coûts et photos y sont donc vides par
 * construction et la marge est nulle (jamais vendue, S24). La tâche 15 charge ces données et calcule la marge.
 */
export function toWatchDetail(watch: WatchWithDetail): WatchDetail {
  const project = watch.restoration_projects;
  return {
    id: watch.id,
    brand: watch.brand,
    model: watch.model,
    movementCode: watch.movement_code,
    complications: watch.comporte
      .map((c) => ({ code: c.complication_code, label: c.complications.label }))
      .sort((a, b) => a.code.localeCompare(b.code)),
    purchasePrice: money(watch.purchase_price),
    purchaseDate: day(watch.purchase_date),
    resalePrice: money(watch.resale_price),
    resaleDate: day(watch.resale_date),
    margin: null,
    projects: project
      ? [
          {
            id: project.id,
            status: project.status as 'in_progress' | 'completed',
            createdAt: project.created_at.toISOString(),
            completedAt: project.completed_at?.toISOString() ?? null,
            photoBefore: project.photo_before,
            photoAfter: project.photo_after,
            steps: project.restoration_steps.map((step) => ({
              id: step.id,
              stepOrder: step.step_order,
              label: step.label,
              notes: step.notes,
              isCompleted: step.is_completed,
              completedAt: step.completed_at?.toISOString() ?? null,
              photos: [],
            })),
            measurements: [],
            expenses: [],
          },
        ]
      : [],
  };
}

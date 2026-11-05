import type { Prisma } from '../generated/prisma/client.js';
import { computeMargin } from './margin.js';

export interface MeasurementDetail {
  id: number;
  measuredAt: string;
  rateSecondsPerDay: string;
  beatErrorMs: string;
  amplitudeDegrees: string;
  watchPosition: string | null;
}

export interface ExpenseDetail {
  id: number;
  label: string;
  amount: string;
  expenseDate: string;
}

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
  measurements: MeasurementDetail[];
  expenses: ExpenseDetail[];
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
  restoration_projects: {
    include: {
      restoration_steps: { orderBy: { step_order: 'asc' }, include: { step_pics: { orderBy: { id: 'asc' } } } },
      performance_measurements: { orderBy: [{ measured_at: 'asc' }, { id: 'asc' }] },
      expenses: { orderBy: [{ expense_date: 'asc' }, { id: 'asc' }] },
    },
  },
} satisfies Prisma.watchesInclude;

export type WatchWithDetail = Prisma.watchesGetPayload<{ include: typeof WATCH_DETAIL_INCLUDE }>;

const day = (date: Date | null): string | null => (date ? date.toISOString().slice(0, 10) : null);
const money = (amount: Prisma.Decimal | null): string | null => (amount ? amount.toFixed(2) : null);

/** Forme renvoyée par l'API pour une étape, avec ses photos. */
export function toStepDetail(step: Prisma.restoration_stepsGetPayload<{ include: { step_pics: true } }>): StepDetail {
  return {
    id: step.id,
    stepOrder: step.step_order,
    label: step.label,
    notes: step.notes,
    isCompleted: step.is_completed,
    completedAt: step.completed_at?.toISOString() ?? null,
    photos: step.step_pics.map((pic) => ({ id: pic.id, url: pic.url })),
  };
}

/** Forme renvoyée par l'API pour une montre ; la marge est calculée ici, à la lecture, jamais stockée (RG-FIN-06). */
export function toWatchDetail(watch: WatchWithDetail): WatchDetail {
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
    margin: money(
      computeMargin({
        resalePrice: watch.resale_price,
        purchasePrice: watch.purchase_price,
        expenses: watch.restoration_projects.flatMap((project) => project.expenses.map((e) => e.amount)),
      }),
    ),
    // Du plus récent au plus ancien (RG-PRJ-08, S26).
    projects: [...watch.restoration_projects]
      .sort((a, b) => b.created_at.getTime() - a.created_at.getTime() || b.id - a.id)
      .map((project) => ({
        id: project.id,
        status: project.status as 'in_progress' | 'completed',
        createdAt: project.created_at.toISOString(),
        completedAt: project.completed_at?.toISOString() ?? null,
        photoBefore: project.photo_before,
        photoAfter: project.photo_after,
        steps: project.restoration_steps.map(toStepDetail),
        measurements: project.performance_measurements.map((m) => ({
          id: m.id,
          measuredAt: m.measured_at.toISOString(),
          rateSecondsPerDay: m.rate_seconds_per_day.toFixed(2),
          beatErrorMs: m.beat_error_ms.toFixed(2),
          amplitudeDegrees: m.amplitude_degrees.toFixed(2),
          watchPosition: m.watch_position,
        })),
        expenses: project.expenses.map((e) => ({
          id: e.id,
          label: e.label,
          amount: e.amount.toFixed(2),
          expenseDate: day(e.expense_date) as string,
        })),
      })),
  };
}

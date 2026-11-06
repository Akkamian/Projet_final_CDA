<script setup lang="ts">
import { computed } from 'vue'
import { formatMeasure, formatRate } from '../format'
import { amplitudeVerdict, beatErrorVerdict, rateVerdict, scaleDomain, scalePosition, ZONES, type Verdict } from '../performance-zones'
import type { MeasurementDetail } from '../stores/watches'

const props = defineProps<{ measurements: MeasurementDetail[] }>()

type Kind = 'rate' | 'beatError' | 'amplitude'

interface Scale {
  kind: Kind
  label: string
  /** Valeurs affichées, première puis dernière (une seule si la piste n'a qu'une mesure). */
  shown: string[]
  verdict: Verdict
  ariaLabel: string
  zone: { left: number; width: number }
  firstAt: number | null
  lastAt: number
  link: { left: number; width: number } | null
  axis: string[]
  zoneText: string
  unit: string
}

const ordered = computed(() => [...props.measurements].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt) || a.id - b.id))

const scales = computed<Scale[]>(() => {
  const list = ordered.value
  if (list.length === 0) return []
  const firstM = list.length > 1 ? list[0]! : null
  const lastM = list[list.length - 1]!

  const defs: {
    kind: Kind
    label: string
    pick: (m: MeasurementDetail) => string
    show: (v: string) => string
    unit: string
    zoneText: string
    verdict: (n: number) => Verdict
  }[] = [
    {
      kind: 'rate',
      label: 'Marche',
      pick: (m) => m.rateSecondsPerDay,
      show: formatRate,
      unit: 's/j',
      zoneText: `±${ZONES.rate.max} s/j`,
      verdict: rateVerdict,
    },
    {
      kind: 'beatError',
      label: 'Beat error',
      pick: (m) => m.beatErrorMs,
      show: (v) => formatMeasure(v),
      unit: 'ms',
      zoneText: `≤ ${ZONES.beatError.max} ms`,
      verdict: beatErrorVerdict,
    },
    {
      kind: 'amplitude',
      label: 'Amplitude',
      pick: (m) => m.amplitudeDegrees,
      show: (v) => formatMeasure(v),
      unit: '°',
      zoneText: `${ZONES.amplitude.min}–${ZONES.amplitude.max}°`,
      verdict: amplitudeVerdict,
    },
  ]

  return defs.map((def) => {
    const lastValue = def.pick(lastM)
    const firstValue = firstM ? def.pick(firstM) : null
    const numbers = [lastValue, ...(firstValue === null ? [] : [firstValue])].map(Number)
    const domain = scaleDomain(def.kind, numbers)
    const zone = ZONES[def.kind]
    const zoneLeft = scalePosition(zone.min, domain)
    const lastAt = scalePosition(Number(lastValue), domain)
    const firstAt = firstValue === null ? null : scalePosition(Number(firstValue), domain)
    const shown = firstValue === null ? [def.show(lastValue)] : [def.show(firstValue), def.show(lastValue)]
    const ariaValues = shown.join(' puis ')
    return {
      kind: def.kind,
      label: def.label,
      shown,
      verdict: def.verdict(Number(lastValue)),
      ariaLabel: `${def.label} : ${ariaValues} ${def.unit}, zone cible ${def.zoneText}`,
      zone: { left: zoneLeft, width: scalePosition(zone.max, domain) - zoneLeft },
      firstAt,
      lastAt,
      link: firstAt === null || firstAt === lastAt ? null : { left: Math.min(firstAt, lastAt), width: Math.abs(firstAt - lastAt) },
      axis: [domain.min, (domain.min + domain.max) / 2, domain.max].map((v) => axisLabel(def.kind, v)),
      zoneText: def.zoneText,
      unit: def.unit,
    }
  })
})

function axisLabel(kind: Kind, value: number): string {
  if (kind === 'rate') return formatRate(String(Math.round(value)))
  if (kind === 'beatError') return formatMeasure(String(value))
  return `${Math.round(value)}°`
}

const pct = (n: number) => `${n.toFixed(1)}%`
const tone = (verdict: Verdict) => (verdict.inZone ? 'ok' : 'warn')
</script>

<template>
  <div v-if="scales.length > 0" class="scales">
    <div v-for="scale in scales" :key="scale.kind" class="scale" data-test="scale">
      <div class="scale-head">
        <span class="scale-label">{{ scale.label }}</span>
        <span class="scale-change tabular">
          <template v-if="scale.shown.length === 2">{{ scale.shown[0] }} → </template
          ><strong>{{ scale.shown[scale.shown.length - 1] }}</strong>
          {{ scale.unit }}
        </span>
      </div>
      <div class="scale-track" role="img" :aria-label="scale.ariaLabel">
        <span class="zone" :style="{ left: pct(scale.zone.left), width: pct(scale.zone.width) }"></span>
        <span
          v-if="scale.link"
          class="link"
          data-test="scale-link"
          :style="{ left: pct(scale.link.left), width: pct(scale.link.width) }"
        ></span>
        <span v-if="scale.firstAt !== null" class="mk first" data-test="marker-first" :style="{ left: pct(scale.firstAt) }"></span>
        <span class="mk last" :class="tone(scale.verdict)" data-test="marker-last" :style="{ left: pct(scale.lastAt) }"></span>
      </div>
      <div class="scale-axis" aria-hidden="true">
        <span v-for="(tick, i) in scale.axis" :key="i">{{ tick }}</span>
      </div>
      <div class="scale-verdict" :class="tone(scale.verdict)" data-test="scale-verdict">{{ scale.verdict.text }}</div>
    </div>
    <p class="perf-legend">
      <span class="mk-legend first"></span> première mesure · <span class="mk-legend last"></span> dernière mesure · bande = zone cible
      (repères indicatifs)
    </p>
  </div>
</template>

<style scoped>
.scales {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.scale {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.scale-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-2);
}

.scale-label {
  color: var(--text-secondary);
  font-size: 12px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.scale-change {
  color: var(--text-secondary);
  font-size: 13px;
  white-space: nowrap;
}

.scale-change strong {
  color: var(--text);
  font-weight: 600;
}

.scale-track {
  position: relative;
  height: 16px;
  margin: 4px 7px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
}

.zone {
  position: absolute;
  top: -1px;
  bottom: -1px;
  min-width: 4px;
  border-right: 1px solid var(--accent-text);
  border-left: 1px solid var(--accent-text);
  background: rgba(17, 233, 126, 0.16);
}

.link {
  position: absolute;
  top: 50%;
  height: 2px;
  margin-top: -1px;
  background: var(--text-secondary);
  opacity: 0.6;
}

.mk {
  position: absolute;
  top: 50%;
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  border-radius: 50%;
}

.mk.first,
.mk-legend.first {
  border: 2px solid var(--text-secondary);
  background: var(--surface);
}

.mk.last,
.mk-legend.last {
  border: 2px solid var(--surface);
  background: var(--text-secondary);
}

.mk.last.ok {
  background: var(--accent-text);
}

.mk.last.warn {
  background: var(--warning);
}

.mk-legend {
  display: inline-block;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  vertical-align: middle;
}

.scale-axis {
  display: flex;
  justify-content: space-between;
  padding: 0 2px;
  color: var(--text-secondary);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.scale-verdict {
  font-size: 12px;
  font-weight: 600;
}

.scale-verdict.ok {
  color: var(--accent-text);
}

.scale-verdict.warn {
  color: var(--warning);
}

.perf-legend {
  margin: var(--space-3) 0 0;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>

<script setup lang="ts">
// Champs d'identité d'une montre, communs à « Nouvelle montre » et « Modifier la montre » : le parent garde la validation, l'envoi et l'état du mouvement et des complications.
defineProps<{
  movementCode: string
  complicationCodes: string[]
  movementTypes: { movementCode: string; label: string }[]
  complications: { complicationCode: string; label: string }[]
  maxDate: string
  complicationHint?: string
}>()
const emit = defineEmits<{ 'select-movement': [code: string]; 'toggle-complication': [code: string] }>()

const brand = defineModel<string>('brand', { required: true })
const model = defineModel<string>('model', { required: true })
const purchasePrice = defineModel<string>('purchasePrice', { required: true })
const purchaseDate = defineModel<string>('purchaseDate', { required: true })
</script>

<template>
  <div class="identity">
    <div class="field">
      <label for="brand">Marque</label>
      <input id="brand" v-model="brand" name="brand" type="text" maxlength="255" autocomplete="off" />
    </div>
    <div class="field">
      <label for="model">Modèle</label>
      <input id="model" v-model="model" name="model" type="text" maxlength="255" autocomplete="off" />
      <span class="field-hint">Le calibre se note dans le modèle (ex. 6119-8100).</span>
    </div>

    <fieldset>
      <legend>Type de mouvement</legend>
      <div class="segmented">
        <label v-for="type in movementTypes" :key="type.movementCode" class="segmented-option">
          <input
            type="radio"
            name="movement"
            :value="type.movementCode"
            :checked="movementCode === type.movementCode"
            @change="emit('select-movement', type.movementCode)"
          />
          <span>{{ type.label }}</span>
        </label>
      </div>
    </fieldset>

    <fieldset>
      <legend>Complications</legend>
      <div class="chip-group">
        <label v-for="item in complications" :key="item.complicationCode" class="chip-toggle">
          <input
            type="checkbox"
            :value="item.complicationCode"
            :checked="complicationCodes.includes(item.complicationCode)"
            @change="emit('toggle-complication', item.complicationCode)"
          />
          <span>{{ item.label }}</span>
        </label>
      </div>
      <span v-if="complicationHint" class="field-hint">{{ complicationHint }}</span>
    </fieldset>

    <div class="pair">
      <div class="field">
        <label for="purchasePrice">Prix d’achat (€) · facultatif</label>
        <input id="purchasePrice" v-model="purchasePrice" name="purchasePrice" type="text" inputmode="decimal" />
      </div>
      <div class="field">
        <label for="purchaseDate">Date d’achat · facultative</label>
        <input id="purchaseDate" v-model="purchaseDate" name="purchaseDate" type="date" :max="maxDate" />
      </div>
    </div>
    <span class="field-hint">
      Une montre gardée de longue date peut ne plus avoir de prix ni de date d’achat. Une date dans le futur est refusée.
    </span>
  </div>
</template>

<style scoped>
.identity {
  display: grid;
  gap: var(--space-4);
}

.field,
fieldset {
  margin: 0;
}

.field label,
legend {
  color: var(--text-secondary);
  font-size: 13px;
}

.field input {
  background: var(--surface);
  font-size: 15px;
}

fieldset {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: 0;
  border: 0;
}

legend {
  padding: 0;
  margin-bottom: var(--space-1);
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
</style>

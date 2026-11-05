<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import { useAuthStore } from '../stores/auth'
import { errorMessage } from '../utils/today'

const auth = useAuthStore()
const router = useRouter()

const currentPassword = ref('')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordError = ref<string | null>(null)
const passwordChanged = ref(false)
const changing = ref(false)

const deleting = ref(false)
const deletePassword = ref('')
const deleteError = ref<string | null>(null)
const deleteBusy = ref(false)

// RG-CPT-03 : vérifié ici avant tout appel ; l'API le revérifie.
async function changePassword() {
  passwordChanged.value = false
  if (newPassword.value.length < 8) {
    passwordError.value = 'Le nouveau mot de passe doit contenir au moins 8 caractères.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    passwordError.value = 'Les mots de passe ne correspondent pas.'
    return
  }
  if (changing.value) return
  changing.value = true
  passwordError.value = null
  try {
    await auth.changePassword(currentPassword.value, newPassword.value)
    currentPassword.value = newPassword.value = confirmPassword.value = ''
    passwordChanged.value = true
  } catch (e) {
    passwordError.value = errorMessage(e)
  } finally {
    changing.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.push({ name: 'login' })
}

function askDelete() {
  deletePassword.value = ''
  deleteError.value = null
  deleting.value = true
}

// Le dialogue reste ouvert en cas d'échec : l'alerte est dans le dialogue, à côté du champ à corriger.
async function confirmDelete() {
  if (deleteBusy.value) return
  if (deletePassword.value === '') {
    deleteError.value = 'Saisissez votre mot de passe pour confirmer.'
    return
  }
  deleteBusy.value = true
  deleteError.value = null
  try {
    await auth.deleteAccount(deletePassword.value)
    deleting.value = false
    await router.push({ name: 'login' })
  } catch (e) {
    deleteError.value = errorMessage(e)
  } finally {
    deleteBusy.value = false
  }
}
</script>

<template>
  <section class="account">
    <p><RouterLink to="/">← Mes montres</RouterLink></p>
    <h1>Mon compte</h1>

    <section class="block">
      <h2>Modifier le mot de passe</h2>
      <form data-test="change-password" novalidate @submit.prevent="changePassword">
        <p v-if="passwordError" class="alert" role="alert">{{ passwordError }}</p>
        <p v-if="passwordChanged" class="notice" role="status">Mot de passe modifié.</p>
        <div class="field">
          <label for="current-password">Mot de passe actuel</label>
          <input id="current-password" v-model="currentPassword" type="password" autocomplete="current-password" maxlength="72" />
        </div>
        <div class="field">
          <label for="new-password">Nouveau mot de passe</label>
          <input id="new-password" v-model="newPassword" type="password" autocomplete="new-password" maxlength="72" />
          <span class="field-hint">8 caractères minimum.</span>
        </div>
        <div class="field">
          <label for="confirm-password">Confirmer le nouveau mot de passe</label>
          <input id="confirm-password" v-model="confirmPassword" type="password" autocomplete="new-password" maxlength="72" />
        </div>
        <button class="btn" type="submit" :disabled="changing">Modifier le mot de passe</button>
      </form>
    </section>

    <section class="block">
      <h2>Session</h2>
      <p class="hint">La déconnexion ferme la session de cet appareil.</p>
      <button class="btn btn-secondary" type="button" @click="logout">Se déconnecter</button>
    </section>

    <section class="block">
      <h2>Suppression du compte</h2>
      <p class="hint">
        Supprime définitivement votre compte et toutes vos données : montres, projets, étapes, notes, photos, mesures et coûts.
      </p>
      <button class="danger" type="button" @click="askDelete">Supprimer mon compte</button>
    </section>

    <ConfirmDialog
      v-if="deleting"
      title="Supprimer mon compte ?"
      message="Cette action est définitive : votre compte, toutes vos montres et leurs projets, les photos et les fichiers associés seront effacés."
      confirm-label="Supprimer définitivement"
      @confirm="confirmDelete"
      @cancel="deleting = false"
    >
      <div class="field">
        <label for="delete-password">Confirmez avec votre mot de passe</label>
        <input id="delete-password" v-model="deletePassword" type="password" autocomplete="current-password" maxlength="1024" />
      </div>
      <p v-if="deleteError" class="alert" role="alert">{{ deleteError }}</p>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.account {
  display: grid;
  gap: var(--space-4);
}

h1,
h2,
p {
  margin: 0;
}

h2 {
  font-size: 1rem;
}

.block {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.block .btn,
.danger {
  justify-self: start;
  width: auto;
}

.danger {
  min-height: var(--touch-min);
  padding: 0 var(--space-4);
  border: 1px solid var(--danger);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--danger-text);
  font: inherit;
  cursor: pointer;
}
</style>

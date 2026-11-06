<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { apiFetch } from '../api/client'
import Avatar from '../components/Avatar.vue'
import ConfirmDialog from '../components/ConfirmDialog.vue'
import PasswordField from '../components/PasswordField.vue'
import Sheet from '../components/Sheet.vue'
import { formatDate } from '../format'
import { useAccountStore } from '../stores/account'
import { useAuthStore } from '../stores/auth'
import type { StatusCounts } from '../stores/watches'
import { errorMessage } from '../utils/today'

const auth = useAuthStore()
const account = useAccountStore()
const router = useRouter()

const profile = computed(() => account.profile)
const memberSince = computed(() =>
  profile.value ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(profile.value.createdAt)) : null,
)

// Compteurs globaux de la collection : lus ici, sans toucher aux filtres du tableau de bord. Un échec laisse « – » dans les tuiles.
const counts = ref<StatusCounts | null>(null)
onMounted(async () => {
  try {
    counts.value = (await apiFetch<{ counts: StatusCounts }>('/watches?page=1&pageSize=1')).counts
  } catch {
    counts.value = null
  }
})
const stat = (key: keyof StatusCounts) => (counts.value ? String(counts.value[key]) : '–')

const changingPassword = ref(false)
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

function openPassword() {
  currentPassword.value = newPassword.value = confirmPassword.value = ''
  passwordError.value = null
  passwordChanged.value = false
  changingPassword.value = true
}

// RG-CPT-03 : vérifié ici avant tout appel ; l'API le revérifie.
async function changePassword() {
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
    changingPassword.value = false
    passwordChanged.value = true
    void account.load()
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
    <section class="block" aria-labelledby="account-identity">
      <h2 id="account-identity">Compte</h2>
      <div class="identity">
        <Avatar variant="large" :initial="account.initial" />
        <div class="identity-text">
          <p class="email" data-test="account-email">{{ profile?.email }}</p>
          <p v-if="memberSince" class="hint">Membre depuis {{ memberSince }}</p>
          <p v-if="profile?.emailVerifiedAt" class="hint">Adresse vérifiée le {{ formatDate(profile.emailVerifiedAt) }}</p>
        </div>
      </div>
    </section>

    <section aria-labelledby="account-stats">
      <h2 id="account-stats" class="section-title">Statistiques</h2>
      <div class="stat-grid">
        <div class="stat-tile">
          <span class="stat-value tabular" data-test="stat-total">{{ stat('all') }}</span>
          <span class="stat-label">Montres</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value tabular" data-test="stat-in-progress">{{ stat('in_progress') }}</span>
          <span class="stat-label">En cours</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value tabular" data-test="stat-finished">{{ stat('completed') }}</span>
          <span class="stat-label">Terminées</span>
        </div>
        <div class="stat-tile">
          <span class="stat-value tabular" data-test="stat-sold">{{ stat('sold') }}</span>
          <span class="stat-label">Vendues</span>
        </div>
      </div>
    </section>

    <section class="block" aria-labelledby="account-security">
      <h2 id="account-security">Sécurité</h2>
      <p v-if="passwordChanged" class="notice" role="status">Mot de passe modifié.</p>
      <div class="row">
        <div>
          <p class="row-label">Mot de passe</p>
          <p class="hint">••••••••</p>
        </div>
        <button class="btn btn-secondary" type="button" data-test="password-open" @click="openPassword">Modifier</button>
      </div>
      <div class="row">
        <p class="row-label">Dernier changement</p>
        <p class="hint" data-test="password-changed-at">
          {{ profile?.passwordChangedAt ? formatDate(profile.passwordChangedAt) : 'Jamais modifié' }}
        </p>
      </div>
    </section>

    <section class="block" aria-labelledby="account-session">
      <h2 id="account-session">Session</h2>
      <p class="hint">La déconnexion ferme la session de cet appareil.</p>
      <button class="btn btn-secondary" type="button" @click="logout">Se déconnecter</button>
    </section>

    <section class="block" aria-labelledby="account-delete">
      <h2 id="account-delete">Suppression du compte</h2>
      <p class="hint">
        Supprime définitivement votre compte et toutes vos données : montres, projets, étapes, notes, photos, mesures et coûts.
      </p>
      <button class="danger" type="button" @click="askDelete">Supprimer mon compte</button>
    </section>

    <Sheet v-if="changingPassword" title="Modifier le mot de passe" :busy="changing" @close="changingPassword = false">
      <form class="sheet-form" data-test="change-password" novalidate @submit.prevent="changePassword">
        <div class="sheet-body">
          <p v-if="passwordError" class="alert" role="alert">{{ passwordError }}</p>
          <PasswordField id="current-password" v-model="currentPassword" label="Mot de passe actuel" autocomplete="current-password" :maxlength="72" />
          <PasswordField
            id="new-password"
            v-model="newPassword"
            label="Nouveau mot de passe"
            autocomplete="new-password"
            :maxlength="72"
            hint="8 caractères minimum."
          />
          <PasswordField id="confirm-password" v-model="confirmPassword" label="Confirmer le nouveau mot de passe" autocomplete="new-password" :maxlength="72" />
        </div>
        <div class="sheet-footer">
          <div class="sheet-actions">
            <button type="button" class="btn btn-secondary" data-test="password-cancel" :disabled="changing" @click="changingPassword = false">Annuler</button>
            <button type="submit" class="btn" :disabled="changing">Modifier le mot de passe</button>
          </div>
        </div>
      </form>
    </Sheet>

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

h2,
p {
  margin: 0;
}

h2 {
  font-size: 1rem;
}

.section-title {
  margin-bottom: var(--space-3);
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

.identity {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.identity-text {
  display: grid;
  gap: var(--space-1);
  min-width: 0;
}

.email {
  overflow-wrap: anywhere;
  font-weight: 600;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.row-label {
  font-weight: 500;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

.stat-tile {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--surface);
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 600;
}

.stat-label {
  color: var(--text-secondary);
  font-size: 0.8125rem;
}

@media (min-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(4, 1fr);
  }
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

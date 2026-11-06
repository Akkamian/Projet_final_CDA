import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import type { ProjectDetail } from '../stores/watches'
import ProjectTabs from './ProjectTabs.vue'

const project = (id: number, status: ProjectDetail['status'], createdAt: string): ProjectDetail => ({
  id,
  status,
  createdAt,
  completedAt: null,
  photoBefore: null,
  photoAfter: null,
  steps: [],
  measurements: [],
  expenses: [],
})

const TWO = [project(2, 'in_progress', '2026-06-10T10:00:00Z'), project(1, 'completed', '2025-05-01T10:00:00Z')]

describe('ProjectTabs', () => {
  it('S26 aucun onglet avec un seul projet', () => {
    const wrapper = mount(ProjectTabs, { props: { projects: [TWO[0]!], selectedId: 2 } })

    expect(wrapper.find('[data-test="project-tabs"]').exists()).toBe(false)
  })

  it('S26 aucun onglet sans projet', () => {
    const wrapper = mount(ProjectTabs, { props: { projects: [], selectedId: null } })

    expect(wrapper.find('[role="tablist"]').exists()).toBe(false)
  })

  it('S26 deux projets : un onglet par projet avec sa date et son état, le projet affiché est sélectionné', () => {
    const wrapper = mount(ProjectTabs, { props: { projects: TWO, selectedId: 2 } })

    const tabs = wrapper.findAll('[role="tab"]')
    expect(tabs.map((t) => t.text())).toEqual(['10/06/2026 · En cours', '01/05/2025 · Terminé'])
    expect(tabs.map((t) => t.attributes('aria-selected'))).toEqual(['true', 'false'])
    expect(tabs.map((t) => t.attributes('tabindex'))).toEqual(['0', '-1'])
  })

  it('un clic sur un onglet émet select avec l’identifiant du projet', async () => {
    const wrapper = mount(ProjectTabs, { props: { projects: TWO, selectedId: 2 } })

    await wrapper.findAll('[role="tab"]')[1]!.trigger('click')

    expect(wrapper.emitted('select')).toEqual([[1]])
  })

  it('les flèches gauche et droite passent d’un onglet à l’autre, en boucle', async () => {
    const wrapper = mount(ProjectTabs, { props: { projects: TWO, selectedId: 2 } })

    await wrapper.findAll('[role="tab"]')[0]!.trigger('keydown', { key: 'ArrowRight' })
    await wrapper.findAll('[role="tab"]')[0]!.trigger('keydown', { key: 'ArrowLeft' })

    expect(wrapper.emitted('select')).toEqual([[1], [1]])
  })
})

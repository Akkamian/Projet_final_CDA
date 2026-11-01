import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import config from '../vite.config'

describe('configuration Vite', () => {
  it('lit les variables VITE_* dans le .env de la racine du monorepo', () => {
    // Le .env vit à la racine (voir .env.example) ; par défaut Vite chercherait dans apps/web.
    // envDir est relatif à la racine du projet Vite (apps/web).
    const envDir = config.envDir
    if (typeof envDir !== 'string') throw new Error('envDir doit être défini')
    expect(resolve(__dirname, '..', envDir)).toBe(resolve(__dirname, '../../..'))
  })
})

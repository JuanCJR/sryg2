import { defineConfig } from 'eslint/config'
import { apiLayerBoundaries, baseConfig } from '../../eslint.config.js'

export default defineConfig([...baseConfig, apiLayerBoundaries])

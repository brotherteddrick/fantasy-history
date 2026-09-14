import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'astro/config'

const repoRoot = fileURLToPath(new URL('../..', import.meta.url))

export default defineConfig({
  output: 'static',
  vite: {
    resolve: {
      alias: {
        '@fh/shared': path.join(repoRoot, 'packages/shared/src'),
      },
    },
    server: {
      fs: { allow: [repoRoot] },
    },
  },
})

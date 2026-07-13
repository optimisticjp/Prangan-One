import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    // Explicit, bounded worker pool. Vitest 4 defaults the fork count to the
    // detected CPU count, which a CI or container runner can over-report while
    // actually having tight memory, and that is the shape of "workers exiting
    // during collection" an external review saw. Pinning a small fixed ceiling
    // makes the number of parallel forks deterministic and low-pressure no
    // matter what the host claims, rather than scaling with a number we do not
    // control. forks (the default pool) is kept on purpose: each file still
    // runs isolated in its own process, so nothing here changes test behavior,
    // only how many run at once. In Vitest 4 these are top-level options, not
    // the old poolOptions block, which that version removed.
    pool: 'forks',
    minWorkers: 1,
    maxWorkers: 2,
  },
})

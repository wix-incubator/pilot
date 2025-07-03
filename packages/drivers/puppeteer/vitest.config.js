import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['examples/**/*.vitest.test.ts'],
    environment: 'node'
  }
})

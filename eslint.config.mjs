import nextVitals from 'eslint-config-next/core-web-vitals'
import prettier from 'eslint-config-prettier'

const eslintConfig = [
  ...nextVitals,
  prettier,
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'vendor/**',
      'coverage/**',
      'playwright-report/**',
      'out/**',
      'build/**',
      'next-env.d.ts',
    ],
  },
]

export default eslintConfig

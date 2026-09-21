import { build } from 'esbuild'
import { createRequire } from 'node:module'
import type { Plugin } from 'vite'

/** Ship the same chart, sandbox and background renderers inside offline publications. */
export function readerBundle(): Plugin {
  const require = createRequire(import.meta.url)
  return {
    name: 'folio-offline-reader',
    resolveId(id) {
      if (id === 'virtual:folio-reader') return '\0folio-reader'
    },
    async load(id) {
      if (id !== '\0folio-reader') return
      const result = await build({
        entryPoints: ['src/portable/reader.tsx'],
        bundle: true,
        write: false,
        minify: true,
        format: 'iife',
        jsx: 'automatic',
        define: { 'process.env.NODE_ENV': '"production"' },
        loader: { '.woff2': 'dataurl' },
        plugins: [
          {
            name: 'inline-assets',
            setup(b) {
              b.onResolve({ filter: /\?inline$/ }, (args) => ({
                path: require.resolve(args.path.replace(/\?inline$/, '')),
              }))
            },
          },
        ],
      })
      return `export default ${JSON.stringify(result.outputFiles[0].text)}`
    },
  }
}

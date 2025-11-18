// 🧠 SureStack Diagnostic Plugin
// Logs file resolution, transformations, and HMR updates for debugging

export default function SureStackDiagnosticPlugin() {
  return {
    name: 'surestack-diagnostic-plugin',
    enforce: 'pre',

    resolveId(source, importer) {
      // Log imports from src/ or using @ aliases
      if (source.includes('/src/') || source.startsWith('@') || source.startsWith('./') || source.startsWith('../')) {
        const importerName = importer ? importer.split('/').pop() : 'entry'
        console.log(`[🔍 Resolve] ${source} → imported from ${importerName}`)
      }
      return null // Let other plugins handle resolution
    },

    transform(code, id) {
      // Log transformations of React components and hooks
      if (id.includes('/src/') && (id.endsWith('.jsx') || id.endsWith('.js'))) {
        if (code.includes('useEffect') || code.includes('useState') || code.includes('return (') || code.includes('export default')) {
          const fileName = id.split('/').pop()
          console.log(`[⚙️  Transform] ${fileName}`)
        }
      }
      return null // Pass through unchanged
    },

    handleHotUpdate(ctx) {
      console.log(`[🔥 HMR] ${ctx.file.split('/').pop()} changed`)
      return null // Let HMR proceed normally
    },

    buildStart() {
      console.log('[🚀 Build] Starting SureStack frontend build...')
    },

    buildEnd() {
      console.log('[✅ Build] SureStack frontend build complete')
    },
  }
}




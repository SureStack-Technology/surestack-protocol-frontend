// 🧩 SureStack Universal ABI Loader
// Dynamically imports ABIs safely for Vite + ESM

export async function loadAbi(fileName) {
  try {
    const module = await import(`@shared/abi/${fileName}.json`)
    return module.default || module
  } catch (err) {
    console.error('[SureStack ABI Loader] ❌ Failed to load', fileName, err);
    throw err;
  }
}

// Synchronous version for cases where dynamic import isn't needed
export function loadAbiSync(fileName) {
  try {
    // For synchronous loading, we'll use a require-like approach
    // This is a fallback - prefer async loadAbi
    throw new Error('Use loadAbi() for async loading instead');
  } catch (err) {
    console.error('[SureStack ABI Loader] ❌ Sync loading not supported, use loadAbi()', err);
    throw err;
  }
}


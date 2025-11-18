export default function RenderProbe({ name, Component }) {
  console.log(`[PROBE] Attempting to render ${name}`)

  try {
    return (
      <div style={{ padding: 20, color: '#0f0', fontFamily: 'monospace' }}>
        <p>PROBE → {name}</p>
        <Component />
      </div>
    )
  } catch (err) {
    console.error(`[PROBE][ERROR] ${name}`, err)
    return <div>⚠ ERROR RENDERING {name}</div>
  }
}

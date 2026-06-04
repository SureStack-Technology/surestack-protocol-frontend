# P4.1 Particle Visibility Debug Report

Generated: 2026-06-04

## Root cause: **Layering (z-index stack)**

`ParticleBackground` was mounting correctly and the draw loop was running, but the canvas was **painted underneath opaque dashboard layers** and was never visible on Prime Intelligence.

### Stacking before fix

| Layer | z-index | Opacity | Effect |
|-------|---------|---------|--------|
| `body::before` gradient | 0 | ~94–98% | Base void gradient |
| `.surestack-particle-bg` (in `#root`) | 0 | 0.62 | **Particles — bottom of app shell** |
| `.surestack-app-content` | 1 | full viewport | Covers entire dashboard |
| `.theme-neuro-layer` / `.neuro-root` | 10 (fixed) | **90–95% opaque** `neuro-gradient` | Fully obscures particles |
| `.theme-overlay-layer` | 15–20 | decorative | Additional cover |
| `.theme-content-layer` / `.content-shell` | 20–30 | `rgba(6,17,34,0.4)` + blur | Cards, sidebar, Prime panels |

Particles at **z-index 0 inside `.surestack-app-shell`** sat **below** the full-viewport app content layer. The neuro grid's nearly opaque gradient covered any remaining visibility.

### Emergency visibility test

- **`z-index: 9999` debug mode** → particles visible → **rendering works**, issue is **layering**
- Particles at z-0 → not visible → **not a mount failure**

## Fix applied (minimal)

1. **Move particles inside layout stack** — `MainLayout` + `PublicMarketingShell` at `theme-particle-layer` **z-index 11**
2. **Above neuro grid (z-10)**, below `theme-content-layer` (z-20) and dashboard cards
3. **Removed global App.jsx mount** — was trapped at z-0 below full-viewport app content
4. Reduced-motion — static particles instead of zero count
5. Debug mode — `VITE_PARTICLE_BACKGROUND_DEBUG=true`

## Browser verification

```javascript
document.querySelectorAll('canvas').length  // expect 1
window.__surestackParticleDebug?.()
```

## Env flags

| Variable | Purpose |
|----------|---------|
| `VITE_ENABLE_PARTICLE_BACKGROUND=true` | Master on/off |
| `VITE_PARTICLE_BACKGROUND_DEBUG=true` | Debug visibility + FPS logs |

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import '@/styles/particle-background.css'

/** 60% cyan/blue, 25% teal, 15% violet accent */
const PARTICLE_PALETTE = [
  { color: '#22d3ee', weight: 30, label: 'cyan' },
  { color: '#38bdf8', weight: 30, label: 'blue' },
  { color: '#2563eb', weight: 15, label: 'deep-blue' },
  { color: '#14b8a6', weight: 25, label: 'teal' },
  { color: '#8b5cf6', weight: 15, label: 'violet-accent' },
]

const MAX_DPR = 2
const LINK_DISTANCE = 130
const MAX_LINKS_PER_PARTICLE = 3

function isEnabled() {
  return import.meta.env.VITE_ENABLE_PARTICLE_BACKGROUND !== 'false'
}

function isDebugMode() {
  return import.meta.env.VITE_PARTICLE_BACKGROUND_DEBUG === 'true'
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function prefersLowPower() {
  if (typeof window === 'undefined') return false
  const cores = navigator.hardwareConcurrency || 8
  const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection
  if (conn?.saveData) return true
  return cores <= 4
}

function pickParticleColor() {
  const total = PARTICLE_PALETTE.reduce((s, c) => s + c.weight, 0)
  let r = Math.random() * total
  for (const entry of PARTICLE_PALETTE) {
    r -= entry.weight
    if (r <= 0) return entry
  }
  return PARTICLE_PALETTE[0]
}

function particleCountForViewport(width, { reducedMotion, lowPower, debug }) {
  if (debug) return width < 640 ? 45 : 75
  if (reducedMotion) return Math.max(28, Math.round(width / 36))
  if (lowPower) {
    if (width < 640) return 22
    if (width < 1024) return 34
    return 44
  }
  if (width < 640) return 32
  if (width < 1024) return 48
  return 64
}

function rand(min, max) {
  return Math.random() * (max - min) + min
}

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function createParticles(count, width, height, debug) {
  return Array.from({ length: count }, () => {
    const { color } = pickParticleColor()
    const { r, g, b } = hexToRgb(color)
    return {
      x: rand(0, width),
      y: rand(0, height),
      size: debug ? rand(4, 6) : rand(1.1, 2.8),
      vx: rand(-0.2, 0.2),
      vy: rand(-0.16, 0.16),
      r,
      g,
      b,
      alpha: debug ? rand(0.6, 0.95) : rand(0.32, 0.62),
    }
  })
}

function readLayerStyles() {
  if (typeof document === 'undefined') return null
  const canvas = document.querySelector('.surestack-particle-bg__canvas')
  const pick = (el) => {
    if (!el) return null
    const s = getComputedStyle(el)
    return {
      zIndex: s.zIndex,
      position: s.position,
      opacity: s.opacity,
      backgroundColor: s.backgroundColor,
    }
  }
  return {
    canvas: pick(canvas),
    themeShell: pick(document.querySelector('.theme-shell')),
    publicShell: pick(document.querySelector('.public-premium-shell')),
    canvasCount: document.querySelectorAll('canvas').length,
  }
}

/**
 * Single global particle canvas — body portal at z-12, above neuro (5), below content (20+).
 */
export default function ParticleBackground() {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const particlesRef = useRef([])
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 })
  const pausedRef = useRef(false)
  const frameCountRef = useRef(0)
  const lastFpsAtRef = useRef(0)
  const debug = isDebugMode()
  const [portalReady, setPortalReady] = useState(false)

  useEffect(() => {
    setPortalReady(typeof document !== 'undefined')
  }, [])

  useEffect(() => {
    if (!isEnabled()) return undefined

    const canvas = canvasRef.current
    if (!canvas) return undefined

    const reducedMotion = prefersReducedMotion() && !debug
    const lowPower = prefersLowPower() && !debug
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const logDebug = (label, payload) => {
      if (import.meta.env.DEV || debug) {
        console.debug(`[ParticleBackground] ${label}`, payload)
      }
    }

    const setCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      const width = window.innerWidth
      const height = window.innerHeight
      sizeRef.current = { width, height, dpr }
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const count = particleCountForViewport(width, { reducedMotion, lowPower, debug })
      particlesRef.current = createParticles(count, width, height, debug)

      logDebug('mounted', {
        width,
        height,
        bufferWidth: canvas.width,
        bufferHeight: canvas.height,
        particles: count,
        dpr,
        reducedMotion,
        lowPower,
        debug,
      })
    }

    const drawLinks = (particles) => {
      const linkBase = debug ? 0.75 : 0.22
      for (let i = 0; i < particles.length; i += 1) {
        let links = 0
        for (let j = i + 1; j < particles.length; j += 1) {
          if (links >= MAX_LINKS_PER_PARTICLE) break
          const a = particles[i]
          const b = particles[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.hypot(dx, dy)
          if (dist > LINK_DISTANCE) continue
          links += 1
          const opacity = (1 - dist / LINK_DISTANCE) * linkBase
          ctx.strokeStyle = `rgba(56, 189, 248, ${opacity})`
          ctx.lineWidth = debug ? 1.4 : 0.85
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.stroke()
        }
      }
    }

    const drawParticles = (particles, animate) => {
      const { width, height } = sizeRef.current
      ctx.clearRect(0, 0, width, height)

      if (debug) {
        ctx.fillStyle = 'rgba(34, 211, 238, 0.12)'
        ctx.fillRect(0, 0, width, height)
      }

      if (animate) {
        for (const p of particles) {
          p.x += p.vx
          p.y += p.vy
          if (p.x < -40) p.x = width + 40
          if (p.x > width + 40) p.x = -40
          if (p.y < -40) p.y = height + 40
          if (p.y > height + 40) p.y = -40
        }
      }

      drawLinks(particles)

      for (const p of particles) {
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 8)
        glow.addColorStop(0, `rgba(${p.r}, ${p.g}, ${p.b}, ${p.alpha})`)
        glow.addColorStop(1, `rgba(${p.r}, ${p.g}, ${p.b}, 0)`)
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const tick = (now) => {
      if (!pausedRef.current) {
        drawParticles(particlesRef.current, !reducedMotion)
        frameCountRef.current += 1
      }

      if (debug && now - lastFpsAtRef.current >= 1000) {
        const elapsed = (now - lastFpsAtRef.current) / 1000
        const fps = Math.round(frameCountRef.current / elapsed)
        logDebug('draw-loop', {
          fps,
          particleCount: particlesRef.current.length,
          animationActive: !reducedMotion && !pausedRef.current,
          layers: readLayerStyles(),
        })
        frameCountRef.current = 0
        lastFpsAtRef.current = now
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    const onResize = () => setCanvasSize()
    const onVisibility = () => {
      pausedRef.current = document.hidden
    }

    setCanvasSize()
    drawParticles(particlesRef.current, false)
    lastFpsAtRef.current = performance.now()
    if (!reducedMotion) {
      rafRef.current = requestAnimationFrame(tick)
    }

    if (import.meta.env.DEV || debug) {
      window.__surestackParticleDebug = () => ({
        enabled: isEnabled(),
        debug,
        size: sizeRef.current,
        particleCount: particlesRef.current.length,
        canvasCount: document.querySelectorAll('canvas').length,
        layers: readLayerStyles(),
      })
    }

    window.addEventListener('resize', onResize, { passive: true })
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      if (window.__surestackParticleDebug) delete window.__surestackParticleDebug
    }
  }, [debug])

  if (!isEnabled() || !portalReady) return null

  const layer = (
    <div
      className={`surestack-particle-bg${debug ? ' surestack-particle-bg--debug' : ''}`}
      aria-hidden="true"
      data-testid="particle-background"
    >
      <div className="surestack-particle-bg__gradient" />
      <canvas ref={canvasRef} className="surestack-particle-bg__canvas" />
    </div>
  )

  return createPortal(layer, document.body)
}

export { isEnabled as isParticleBackgroundEnabled, isDebugMode as isParticleBackgroundDebug }

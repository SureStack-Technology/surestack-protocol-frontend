import { useEffect, useRef } from "react"

const PARTICLE_COUNT = 60

const getRandom = (min, max) => Math.random() * (max - min) + min

export default function NeonParticles() {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    let width = canvas.width = window.innerWidth
    let height = canvas.height = window.innerHeight

    const particles = Array.from({ length: PARTICLE_COUNT }, () => ({
      x: getRandom(0, width),
      y: getRandom(0, height),
      size: getRandom(1, 2.5),
      velocityX: getRandom(-0.25, 0.25),
      velocityY: getRandom(-0.2, 0.2),
      hue: Math.random() > 0.5 ? 180 : 310,
      alpha: getRandom(0.35, 0.75)
    }))

    const draw = () => {
      ctx.clearRect(0, 0, width, height)

      particles.forEach(p => {
        p.x += p.velocityX
        p.y += p.velocityY

        if (p.x < -50) p.x = width + 50
        if (p.x > width + 50) p.x = -50
        if (p.y < -50) p.y = height + 50
        if (p.y > height + 50) p.y = -50

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 8)
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 60%, ${p.alpha})`)
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 20%, 0)`)

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2)
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(draw)
    }

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }

    window.addEventListener("resize", handleResize)
    draw()

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-30 opacity-80"
      style={{ filter: "blur(0.35px)" }}
    />
  )
}

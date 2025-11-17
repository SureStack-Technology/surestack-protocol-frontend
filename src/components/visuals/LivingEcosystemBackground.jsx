import { useEffect, useRef } from "react";
import { useSimulation } from "../../contexts/SimulationContext";

export default function LivingEcosystemBackground() {
  const canvasRef = useRef(null);
  const { simulationMode } = useSimulation();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    let w, h, nodes = [], hue = 260, frame = 0, animationId;

    let connected = !!window.ethereum?.selectedAddress;

    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      nodes = Array.from({ length: 45 }).map(() => ({
        x: Math.random() * w,
        y: Math.random() * h,
        z: Math.random() * 3 + 1, // depth layer
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        radius: Math.random() * 2 + 1.2,
        pulse: Math.random() * 1000,
      }));
    };

    const draw = () => {
      frame++;
      hue = (hue + 0.1) % 360;
      ctx.clearRect(0, 0, w, h);

      // Transparent gradient overlay
      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, "rgba(15, 23, 42, 0.35)");
      gradient.addColorStop(1, "rgba(76, 29, 149, 0.35)");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      nodes.forEach((n) => {
        n.x += n.vx * n.z * 0.4;
        n.y += n.vy * n.z * 0.4;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.pulse += 0.03;
        const glow = Math.sin(n.pulse) * 0.5 + 0.5;
        const brightness = connected ? 1.2 : 0.8;

        // Draw node
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * n.z, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, 100%, ${50 + glow * 30}%, ${0.7 * brightness})`;
        ctx.shadowBlur = 12 * n.z;
        ctx.shadowColor = `hsla(${hue}, 90%, 70%, 0.6)`;
        ctx.fill();
      });

      // Connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const strength = 1 - dist / 160;
            const pulse = Math.sin(frame / 50 + i + j) * 0.5 + 0.5;
            ctx.strokeStyle = `hsla(${hue + pulse * 40}, 100%, ${50 + pulse * 20}%, ${strength * 0.25})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      if (!simulationMode) {
        animationId = requestAnimationFrame(draw);
      }
    };

    resize();
    draw();

    window.addEventListener("resize", resize);

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      window.removeEventListener("resize", resize);
    };
  }, [simulationMode]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      style={{
        filter: "blur(1px) brightness(1.1)",
        transition: "opacity 1s ease-in-out",
      }}
    />
  );
}

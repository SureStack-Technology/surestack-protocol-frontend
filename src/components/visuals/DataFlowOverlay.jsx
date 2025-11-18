import { useRef, useEffect } from "react";

export default function DataFlowOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Network nodes
    const nodes = Array.from({ length: 15 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      radius: 2 + Math.random() * 2,
    }));

    // Particles flowing between nodes
    const particles = Array.from({ length: 30 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      targetX: Math.random() * canvas.width,
      targetY: Math.random() * canvas.height,
      progress: Math.random(),
      speed: 0.01 + Math.random() * 0.02,
      life: 1,
    }));

    let animationId;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections
      ctx.strokeStyle = "rgba(0, 245, 255, 0.1)";
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 200) {
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Update and draw nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

        // Draw node
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3);
        gradient.addColorStop(0, "rgba(0, 245, 255, 0.8)");
        gradient.addColorStop(1, "rgba(0, 245, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Update and draw particles
      particles.forEach((p) => {
        p.progress += p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          p.targetX = Math.random() * canvas.width;
          p.targetY = Math.random() * canvas.height;
        }

        const x = p.x + (p.targetX - p.x) * p.progress;
        const y = p.y + (p.targetY - p.y) * p.progress;

        ctx.fillStyle = `rgba(0, 245, 255, ${p.life})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(draw);
    };

    draw();

    // Listen for data updates
    const handleUpdate = () => {
      // Trigger particle burst
      particles.forEach((p) => {
        p.life = 1;
        p.progress = 0;
        p.targetX = Math.random() * canvas.width;
        p.targetY = Math.random() * canvas.height;
      });
    };

    document.addEventListener("dashboard-pulse", handleUpdate);
    document.addEventListener("oracle-pulse", handleUpdate);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
      document.removeEventListener("dashboard-pulse", handleUpdate);
      document.removeEventListener("oracle-pulse", handleUpdate);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 opacity-30 pointer-events-none"
      style={{
        mixBlendMode: "normal",
        filter: "contrast(98%) brightness(102%)",
        willChange: "transform, opacity",
        backfaceVisibility: "hidden",
      }}
    />
  );
}

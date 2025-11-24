import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";

export default function LiquidMetricCard({ title, value, unit, color = "#9333EA", subtitle }) {
  const canvasRef = useRef(null);
  const [waveOffset, setWaveOffset] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    const width = (canvas.width = 160);
    const height = (canvas.height = 160);
    const radius = 60;
    let t = 0;

    const draw = () => {
      t += 0.03;
      ctx.clearRect(0, 0, width, height);

      // Wave fill
      ctx.beginPath();
      const baseY = height / 2 + Math.sin(t / 3) * 5;
      for (let x = 0; x <= width; x++) {
        const y = baseY + Math.sin(x * 0.05 + t) * 5;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(width, height);
      ctx.lineTo(0, height);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, `${color}80`);
      grad.addColorStop(1, `${color}20`);
      ctx.fillStyle = grad;
      ctx.fill();

      // Outer ring
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.strokeStyle = `${color}AA`;
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, radius - 2, 0, Math.PI * 2);
      ctx.stroke();

      requestAnimationFrame(draw);
    };

    draw();
  }, [color]);

  return (
    <motion.div
      whileHover={{ scale: 1.04, rotateY: 3 }}
      className="flex flex-col items-center justify-center text-white p-4 rounded-2xl bg-gradient-to-br from-slate-900/40 to-purple-900/20 border border-purple-600/20 backdrop-blur-xl shadow-lg relative overflow-hidden"
    >
      <canvas ref={canvasRef} className="mb-2 opacity-80" />
      <h3 className="text-sm uppercase tracking-wide text-purple-300">{title}</h3>
      <p className="text-3xl font-bold mt-1">{value} {unit}</p>
      {subtitle && <p className="text-xs text-purple-400 mt-1">{subtitle}</p>}
    </motion.div>
  );
}





















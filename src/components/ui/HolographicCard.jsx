import { motion } from "framer-motion";

export default function HolographicCard({
  title,
  value,
  subtitle,
  icon,
  riskScore = 0,
  className = ""
}) {
  // Map risk score to color and animation
  const getRiskStyle = (score) => {
    if (score >= 70) {
      return {
        borderColor: 'rgba(255, 45, 85, 0.6)',
        glowColor: 'rgba(255, 45, 85, 0.4)',
        animation: 'pulse-risk',
        textColor: 'text-neon-pink',
      };
    } else if (score >= 40) {
      return {
        borderColor: 'rgba(255, 184, 0, 0.5)',
        glowColor: 'rgba(255, 184, 0, 0.3)',
        animation: 'pulse-slow',
        textColor: 'text-neon-yellow',
      };
    } else {
      return {
        borderColor: 'rgba(0, 245, 255, 0.4)',
        glowColor: 'rgba(0, 245, 255, 0.3)',
        animation: 'pulse-safe',
        textColor: 'text-neon-cyan',
      };
    }
  };

  const riskStyle = getRiskStyle(riskScore);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`card-hoverable relative overflow-hidden rounded-2xl p-6 bg-[rgba(255,255,255,0.04)] border border-[rgba(0,255,240,0.25)] shadow-[0_0_25px_rgba(0,255,240,0.25)] backdrop-blur-xl ${className} ${riskStyle.animation}`}
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        borderColor: riskStyle.borderColor,
        boxShadow: `0 0 25px ${riskStyle.glowColor}`,
      }}
    >
      {/* Inner glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${riskStyle.glowColor}, transparent 70%)`,
          animation: 'volatility-glow 2s ease-in-out infinite',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-subheading uppercase tracking-wider text-slate-400">
            {title}
          </h3>
          {icon && <div className={`text-xl ${riskStyle.textColor}`}>{icon}</div>}
        </div>
        
        <h2 className={`text-3xl font-heading font-bold mb-1 ${riskStyle.textColor}`}>
          {value}
        </h2>
        
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-mono">
            {subtitle}
          </p>
        )}

        {/* Risk indicator bar */}
        {riskScore > 0 && (
          <div className="mt-3 h-1 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${riskStyle.borderColor}, ${riskStyle.glowColor})`,
                width: `${riskScore}%`,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${riskScore}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        )}
      </div>

      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: riskStyle.borderColor }} />
      <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: riskStyle.borderColor }} />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: riskStyle.borderColor }} />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: riskStyle.borderColor }} />
    </motion.div>
  );
}

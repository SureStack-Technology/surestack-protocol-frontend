import { motion } from "framer-motion";

export default function NeuralMetricPanel({ label, value, change }) {
  const color = change > 0 ? "text-green-400" : change < 0 ? "text-red-400" : "text-gray-400";

  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="p-4 border border-white/10 bg-gradient-to-br from-slate-900/40 to-indigo-900/20 rounded-xl backdrop-blur-lg"
    >
      <p className="text-xs uppercase tracking-wider text-purple-300 mb-1">{label}</p>
      <h2 className="text-xl font-semibold text-white">{value}</h2>
      <p className={`text-xs mt-1 ${color}`}>{change >= 0 ? "+" : ""}{change}%</p>
    </motion.div>
  );
}


















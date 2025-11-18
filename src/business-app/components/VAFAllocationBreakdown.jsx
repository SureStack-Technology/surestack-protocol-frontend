import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { motion } from "framer-motion";

const COLORS = [
  "var(--primary-cyan)",
  "rgba(6, 87, 180, 0.85)",
  "var(--primary-magenta)",
];

function formatCurrency(amount) {
  return `$${Number(amount || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

export default function VAFAllocationBreakdown({ allocation }) {
  const data = [
    { name: "Risk Pool", value: allocation?.pool ?? 0 },
    { name: "Reinsurance", value: allocation?.reinsurance ?? 0 },
    { name: "SureStack Revenue", value: allocation?.revenue ?? 0 },
  ];

  const total = data.reduce((sum, item) => sum + (item.value || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0.6, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="glass-card p-4 space-y-4"
    >
      <div>
        <h3 className="text-xl font-heading text-[var(--primary-cyan)]">
          Allocation Breakdown
        </h3>
        <p className="text-sm text-[color:rgba(200,228,255,0.68)]">
          Funds are distributed to maintain solvency, reinsurance buffers, and protocol growth.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row items-start gap-6">
        <div className="w-full lg:w-1/2 h-56">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                innerRadius={45}
                outerRadius={80}
                paddingAngle={4}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [formatCurrency(value), name]}
                contentStyle={{
                  background: "#101826",
                  borderRadius: "10px",
                  border: "1px solid rgba(6, 87, 180, 0.35)",
                  color: "#E6F3FF",
                }}
              />
              <Legend verticalAlign="bottom" height={36} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1 space-y-3 text-sm text-[color:rgba(200,228,255,0.75)]">
          <div className="glass-panel p-3">
            <h4 className="text-sm font-semibold text-[var(--primary-cyan)] mb-1">
              Risk Pool • 60%
            </h4>
            <p>Primary liquidity reserve to honour claims & stabilise coverage.</p>
            <p className="mt-1 text-xs text-[color:rgba(200,228,255,0.6)]">
              Allocation: {formatCurrency(allocation?.pool ?? 0)}
            </p>
          </div>
          <div className="glass-panel p-3">
            <h4 className="text-sm font-semibold text-[var(--primary-blue)] mb-1">
              Reinsurance • 20%
            </h4>
            <p>Secondary reserve purchasing reinsurance cover for black swan events.</p>
            <p className="mt-1 text-xs text-[color:rgba(200,228,255,0.6)]">
              Allocation: {formatCurrency(allocation?.reinsurance ?? 0)}
            </p>
          </div>
          <div className="glass-panel p-3">
            <h4 className="text-sm font-semibold text-[var(--primary-magenta)] mb-1">
              Protocol Revenue • 20%
            </h4>
            <p>Supports product development, treasury growth, and validator incentives.</p>
            <p className="mt-1 text-xs text-[color:rgba(200,228,255,0.6)]">
              Allocation: {formatCurrency(allocation?.revenue ?? 0)}
            </p>
          </div>
          <p className="text-xs text-[color:rgba(200,228,255,0.58)]">
            Total VAF collected: {formatCurrency(total)} (Actuarial calculation)
          </p>
        </div>
      </div>
    </motion.div>
  );
}


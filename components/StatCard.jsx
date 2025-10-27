export default function StatCard({ title, value, icon: Icon, change24h, change7d }) {
  return (
    <div className="glassmorphism rounded-2xl p-6 hover:bg-white/10 hover:scale-105 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium group-hover:text-gray-300 transition-colors">{title}</p>
          <p className="text-2xl font-bold text-white mt-1 group-hover:text-accent transition-colors">{value}</p>
          
          {/* Change Indicators */}
          {(change24h || change7d) && (
            <div className="flex space-x-3 mt-2">
              {change24h && (
                <span className="text-xs text-green-400 bg-green-500/20 px-2 py-1 rounded-full">
                  24h: {change24h}
                </span>
              )}
              {change7d && (
                <span className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded-full">
                  7d: {change7d}
                </span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 bg-accent/20 rounded-xl group-hover:bg-accent/30 transition-colors">
            <Icon className="h-6 w-6 text-accent group-hover:scale-110 transition-transform" />
          </div>
        )}
      </div>
    </div>
  );
}

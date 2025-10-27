export default function SkeletonCard() {
  return (
    <div className="glassmorphism rounded-2xl p-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded w-24"></div>
          <div className="h-8 bg-gray-600 rounded w-32"></div>
        </div>
        <div className="p-3 bg-gray-700 rounded-xl">
          <div className="h-6 w-6 bg-gray-600 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="glassmorphism rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-48 mb-4"></div>
      <div className="h-64 bg-gray-700 rounded"></div>
    </div>
  );
}

export function SkeletonTable() {
  return (
    <div className="glassmorphism rounded-2xl p-6 animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-32 mb-6"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex space-x-4">
            <div className="h-4 bg-gray-700 rounded flex-1"></div>
            <div className="h-4 bg-gray-700 rounded w-20"></div>
            <div className="h-4 bg-gray-700 rounded w-16"></div>
            <div className="h-4 bg-gray-700 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  );
}

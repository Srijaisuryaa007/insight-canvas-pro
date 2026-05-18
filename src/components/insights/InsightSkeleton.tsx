// Skeleton card matching InsightCard layout
export default function InsightSkeleton() {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0F172A] p-5 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-24 rounded bg-white/10" />
        <div className="h-5 w-12 rounded bg-white/10" />
      </div>
      <div className="space-y-4">
        <div>
          <div className="h-3 w-32 rounded bg-purple-500/20 mb-2" />
          <div className="h-4 w-full rounded bg-white/10 mb-1" />
          <div className="h-4 w-5/6 rounded bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-32 rounded bg-amber-500/20 mb-2" />
          <div className="h-4 w-full rounded bg-white/10 mb-1" />
          <div className="h-4 w-4/6 rounded bg-white/10" />
        </div>
        <div>
          <div className="h-3 w-32 rounded bg-emerald-500/20 mb-2" />
          <div className="h-3 w-full rounded bg-white/10 mb-1" />
          <div className="h-3 w-5/6 rounded bg-white/10 mb-1" />
          <div className="h-3 w-4/6 rounded bg-white/10" />
        </div>
        <div className="h-[160px] rounded bg-white/5" />
        <div className="flex gap-2">
          <div className="h-6 w-20 rounded-full bg-white/10" />
          <div className="h-6 w-16 rounded-full bg-white/10" />
          <div className="h-6 w-24 rounded-full bg-white/10" />
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
        <div className="h-8 w-24 rounded bg-white/10" />
        <div className="h-8 w-28 rounded bg-white/10" />
        <div className="h-8 w-20 rounded bg-white/10" />
      </div>
    </div>
  );
}

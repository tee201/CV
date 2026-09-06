export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-4 px-4 pt-6">
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
        <p className="text-sm text-slate-600">{description}</p>
        <p className="mt-2 text-xs font-medium uppercase tracking-wide text-slate-400">Coming soon</p>
      </div>
    </div>
  );
}

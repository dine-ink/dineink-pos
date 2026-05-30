export default function PageLoader() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-gray-50">
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-gray-200 border-t-red-500" />
      <p className="text-xs font-semibold text-gray-400">Loading...</p>
    </div>
  );
}

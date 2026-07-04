export function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-9 w-9 rounded-full border-[3px] border-cream-300 border-t-saffron-500 animate-spin" />
        <span className="text-[13px] text-navy-400">લોડ થાય છે...</span>
      </div>
    </div>
  )
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img
        src="/sadaksetu-logo.png"
        alt="SadakSetu Logo"
        className={compact ? 'h-8 w-8 rounded-xl object-cover shadow-sm' : 'h-10 w-10 rounded-xl object-cover shadow-sm'}
      />
      <div>
        <div className="flex items-center gap-1.5">
          <p className="text-[18px] font-extrabold tracking-tight text-white leading-tight">
            Sadak<span className="text-[#2DD4BF]">Setu</span>
          </p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Admin Console
        </p>
      </div>
    </div>
  )
}

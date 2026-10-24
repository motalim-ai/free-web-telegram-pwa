export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex shrink-0 items-center gap-2 rounded-full py-1 text-sm"
    >
      <span className={`relative h-7 w-12 rounded-full transition ${checked ? 'bg-bean' : 'bg-ink/20'}`}>
        <span className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all ${checked ? 'start-6' : 'start-1'}`} />
      </span>
      <span className={`w-8 text-start ${checked ? 'text-bean' : 'text-muted'}`}>{label}</span>
    </button>
  );
}

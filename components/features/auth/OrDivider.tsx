interface OrDividerProps {
  label?: string
}

export function OrDivider({ label = 'or' }: OrDividerProps = {}) {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-border" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-card text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

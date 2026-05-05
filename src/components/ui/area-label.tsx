import { cn } from '@/lib/utils'

interface AreaLabelProps {
  children: React.ReactNode
  className?: string
}

export function AreaLabel({ children, className }: AreaLabelProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5',
        'text-[10px] font-medium uppercase tracking-widest',
        'text-muted-foreground/50 bg-muted/40 select-none',
        className
      )}
    >
      {children}
    </span>
  )
}

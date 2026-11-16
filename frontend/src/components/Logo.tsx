import { CodeXml } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Логотип «Код-репетитор»: значок </> в индиго-квадрате и название. */
export function Logo({ className, size = 'md' }: { className?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={cn('flex items-center gap-3 font-semibold', className)}>
      <span
        className={cn(
          'grid place-items-center rounded-[10px] bg-primary text-primary-foreground shadow-lg shadow-primary/30',
          size === 'md' ? 'size-9' : 'size-8',
        )}
        aria-hidden="true"
      >
        <CodeXml className="size-4.5" />
      </span>
      <span className={size === 'md' ? 'text-lg' : 'text-base'}>Код-репетитор</span>
    </div>
  )
}

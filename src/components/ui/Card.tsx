import { cn } from '@/lib/utils'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className, children }: CardProps) {
  return (
    <div className={cn('bg-[#111111] border border-[#1f1f1f] rounded-lg', className)}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children }: CardProps) {
  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-b border-[#1f1f1f]', className)}>
      {children}
    </div>
  )
}

export function CardBody({ className, children }: CardProps) {
  return (
    <div className={cn('px-4 py-3', className)}>
      {children}
    </div>
  )
}

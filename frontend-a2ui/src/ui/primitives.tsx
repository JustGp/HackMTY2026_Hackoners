import type { ComponentPropsWithoutRef } from 'react'

type CardProps = ComponentPropsWithoutRef<'div'>

export function Card({ className = '', ...props }: CardProps) {
  return (
    <div
      {...props}
      className={['relative rounded-xl border border-brand-gray-light bg-white p-4 shadow-sm', className]
        .filter(Boolean)
        .join(' ')}
    />
  )
}

import type { ReactNode } from 'react'

type A2UITextProps = {
  children: ReactNode
}

export function A2UIText({ children }: A2UITextProps) {
  return <p>{children}</p>
}

type A2UIButtonProps = {
  label: string
  onClick?: () => void
}

export function A2UIButton({ label, onClick }: A2UIButtonProps) {
  return (
    <button type="button" onClick={onClick}>
      {label}
    </button>
  )
}

type A2UIChartProps = {
  title: string
}

export function A2UIChart({ title }: A2UIChartProps) {
  return <section aria-label={title}>Chart placeholder: {title}</section>
}

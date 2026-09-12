import type { ReactNode } from 'react'

type RendererShellProps = {
  children: ReactNode
}

export function RendererShell({ children }: RendererShellProps) {
  return <div data-renderer-shell="true">{children}</div>
}

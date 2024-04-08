import { Outlet, UIMatch, useMatches } from '@remix-run/react'
import { ReactNode } from 'react'

type SidebarHandle = {
  renderSidebar: (data?: unknown) => ReactNode
}
type MatchWithSidebar = UIMatch<unknown, SidebarHandle>

export default function AppLayout() {
  const matches = useMatches()
  const sidebarMatch = matches.findLast((match): match is MatchWithSidebar =>
    Boolean((match.handle as SidebarHandle)?.renderSidebar),
  )
  const sidebar = sidebarMatch
    ? sidebarMatch.handle.renderSidebar(sidebarMatch.data)
    : null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[16rem_1fr] md:grid-cols-[19rem_1fr]">
      <aside className="hidden overflow-auto p-8 sm:block sm:max-h-screen">
        {sidebar}
      </aside>
      <div className="grid grid-rows-[auto_1fr] sm:max-h-screen sm:overflow-auto ">
        <header></header>
        <main className="flex sm:max-h-screen sm:overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

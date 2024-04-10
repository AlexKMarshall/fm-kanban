import { Outlet, UIMatch, useMatches } from '@remix-run/react'
import { FunctionComponent, ReactNode } from 'react'

type SidebarHandle = {
  renderSidebar: (data?: unknown) => ReactNode
}
type MatchWithSidebar = UIMatch<unknown, SidebarHandle>
type HeaderHandle = {
  Header: FunctionComponent<Record<string, unknown>>
}
type MatchWithHeader = UIMatch<unknown, HeaderHandle>

export default function AppLayout() {
  const matches = useMatches()
  const sidebarMatch = matches.findLast((match): match is MatchWithSidebar =>
    Boolean((match.handle as SidebarHandle)?.renderSidebar),
  )
  const sidebar = sidebarMatch
    ? sidebarMatch.handle.renderSidebar(sidebarMatch.data)
    : null

  const headerMatch = matches.findLast((match): match is MatchWithHeader =>
    Boolean((match.handle as HeaderHandle)?.Header),
  )
  const header = headerMatch ? (
    <headerMatch.handle.Header loaderData={headerMatch.data} />
  ) : null
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[16rem_1fr] md:grid-cols-[19rem_1fr]">
      <aside className="hidden overflow-auto p-8 sm:block sm:max-h-screen">
        {sidebar}
      </aside>
      <div className="grid grid-rows-[auto_1fr] border border-l-gray-200 sm:max-h-screen sm:overflow-auto ">
        <header className="border-b border-b-gray-200 bg-white p-4">
          {header}
        </header>
        <main className="flex overflow-x-auto bg-gray-50">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

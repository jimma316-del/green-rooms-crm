import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { NewLeadButton } from '@/components/leads/NewLeadButton'
import { NewLeadNotifier } from './NewLeadNotifier'

export function AppShell({ children, role }: { children: React.ReactNode; role?: string }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <MobileNav role={role} />
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {children}
        </main>
      </div>
      <NewLeadButton />
      <NewLeadNotifier />
    </div>
  )
}

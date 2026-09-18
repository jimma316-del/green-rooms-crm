'use client'

import { createContext, useContext, useState } from 'react'
import { FileText, Image, GitBranch, Camera } from 'lucide-react'

const TabCtx = createContext('quote')

export function QuoteEditorTabs({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState('quote')

  return (
    <TabCtx.Provider value={active}>
      {/* Tab strip */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex max-w-5xl mx-auto">
          {([
            { id: 'quote',      label: 'Quote',             Icon: FileText },
            { id: 'elevations', label: 'Elevations',         Icon: Image },
            { id: 'photos',     label: 'Photos',             Icon: Camera },
            { id: 'variations', label: 'Variations',         Icon: GitBranch },
          ] as const).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {children}
    </TabCtx.Provider>
  )
}

export function QuoteTabPanel({ tabId, className = '', children }: { tabId: string; className?: string; children: React.ReactNode }) {
  const active = useContext(TabCtx)
  return (
    <div className={active === tabId ? className : 'hidden'}>
      {children}
    </div>
  )
}

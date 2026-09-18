'use client'

import { useState } from 'react'
import { FileText, Image, GitBranch } from 'lucide-react'

interface Tab { id: string; label: string; icon: React.ReactNode }

const TABS: Tab[] = [
  { id: 'quote',      label: 'Quote',            icon: <FileText size={14} /> },
  { id: 'elevations', label: 'Elevation Diagrams', icon: <Image size={14} /> },
  { id: 'variations', label: 'Variations',         icon: <GitBranch size={14} /> },
]

export function QuoteEditorTabs({ children }: { children: (activeTab: string) => React.ReactNode }) {
  const [active, setActive] = useState('quote')

  return (
    <>
      {/* Tab strip — sits below the breadcrumb */}
      <div className="bg-white border-b border-gray-100 px-4">
        <div className="flex gap-0 max-w-5xl mx-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === tab.id
                  ? 'border-[var(--primary)] text-[var(--primary)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {children(active)}
    </>
  )
}

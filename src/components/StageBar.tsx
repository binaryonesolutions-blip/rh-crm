'use client'

import { STATUS_FLOW, STATUS_LABELS } from '@/types'
import type { QuoteStatus } from '@/types'

interface StageBarProps {
  current:  QuoteStatus
  onChange: (status: QuoteStatus) => void
  disabled?: boolean
}

export default function StageBar({ current, onChange, disabled }: StageBarProps) {
  const currentIdx = STATUS_FLOW.indexOf(current)

  return (
    <div className="flex items-stretch bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
      {STATUS_FLOW.map((status, i) => {
        const done   = i < currentIdx
        const active = i === currentIdx

        return (
          <button
            key={status}
            disabled={disabled}
            onClick={() => !disabled && onChange(status)}
            className={`
              flex items-center gap-2 px-5 py-2.5 font-medium transition-colors
              ${active  ? 'bg-rhombus-blue text-white' : ''}
              ${done    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' : ''}
              ${!active && !done ? 'text-gray-400 hover:bg-gray-50' : ''}
              ${disabled ? 'cursor-default' : 'cursor-pointer'}
              ${i < STATUS_FLOW.length - 1 ? 'border-r border-gray-200' : ''}
            `}>
            {/* Step indicator */}
            <span className={`
              w-5 h-5 rounded-full text-xs flex items-center justify-center shrink-0
              ${active ? 'bg-white text-rhombus-blue font-semibold' : ''}
              ${done   ? 'bg-blue-200 text-blue-800' : ''}
              ${!active && !done ? 'border border-gray-300 text-gray-400' : ''}
            `}>
              {done ? '✓' : i + 1}
            </span>
            {STATUS_LABELS[status]}
          </button>
        )
      })}
    </div>
  )
}

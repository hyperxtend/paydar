import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'
import type { SelectOption } from './Select'

interface Props<T extends string> {
  value: T[]
  onChange: (value: T[]) => void
  options: SelectOption<T>[]
  /** Shown when nothing is selected. */
  placeholder?: string
  /** Noun for the trigger when several are picked, e.g. "statuses" → "3 statuses". */
  pluralLabel?: string
  /** Applied to the wrapper; use it for width (the trigger fills it). */
  className?: string
  'aria-label'?: string
}

/**
 * Multi-pick sibling of Select: the list stays open while toggling options,
 * each shown with a checkbox. Options keep their given order in the result.
 */
export default function MultiSelect<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Any',
  pluralLabel = 'selected',
  className = '',
  'aria-label': ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const close = useCallback(() => setOpen(false), [])
  useOnClickOutside(rootRef, close)

  useEffect(() => {
    if (open) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function toggle(i: number) {
    const picked = options[i].value
    const next = value.includes(picked) ? value.filter((v) => v !== picked) : [...value, picked]
    onChange(options.map((o) => o.value).filter((v) => next.includes(v)))
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setActive(0)
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); break
      case 'ArrowUp':   e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); break
      case 'Home':      e.preventDefault(); setActive(0); break
      case 'End':       e.preventDefault(); setActive(options.length - 1); break
      case 'Enter':
      case ' ':         e.preventDefault(); toggle(active); break
      case 'Escape':    e.preventDefault(); setOpen(false); break
      case 'Tab':       setOpen(false); break
    }
  }

  const selectedLabels = options.filter((o) => value.includes(o.value)).map((o) => o.label)
  const summary =
    selectedLabels.length === 0 ? placeholder
    : selectedLabels.length <= 2 ? selectedLabels.join(', ')
    : `${selectedLabels.length} ${pluralLabel}`

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        className={`field flex items-center justify-between gap-2 text-left active:scale-100 px-3 py-2 text-sm ${
          open ? 'bg-white border-navy-600 ring-4 ring-navy-600/10' : ''
        }`}
      >
        <span className="truncate">{summary}</span>
        <svg
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1.5 w-full min-w-max max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto rounded-[10px] bg-white p-1 shadow-xl ring-1 ring-black/5"
        >
          {options.map((o, i) => {
            const isSelected = value.includes(o.value)
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => toggle(i)}
                className={`flex items-center gap-2.5 rounded-md cursor-pointer px-2.5 py-1.5 text-sm ${
                  i === active ? 'bg-navy-50 text-navy-700' : 'text-gray-700'
                }`}
              >
                <span
                  className={`h-4 w-4 flex-shrink-0 rounded-[4px] flex items-center justify-center ring-1 ${
                    isSelected ? 'bg-navy-600 ring-navy-600 text-white' : 'bg-white ring-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  )}
                </span>
                {o.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

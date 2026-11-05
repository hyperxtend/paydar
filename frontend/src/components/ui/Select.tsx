import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { useOnClickOutside } from '../../hooks/useOnClickOutside'

export interface SelectOption<T extends string = string> {
  value: T
  label: string
  /** Muted text shown before the label, e.g. a currency symbol */
  hint?: string
}

interface Props<T extends string> {
  value: T | ''
  onChange: (value: T) => void
  options: SelectOption<T>[]
  placeholder?: string
  size?: 'sm' | 'md'
  /** Applied to the wrapper; use it for width (the trigger fills it). */
  className?: string
  id?: string
  onBlur?: () => void
  'aria-label'?: string
}

const sizes = {
  sm: { trigger: 'px-2.5 py-1 text-xs', option: 'px-2 py-1 text-xs' },
  md: { trigger: 'px-3 py-2 text-sm',   option: 'px-2.5 py-1.5 text-sm' },
}

function OptionHint({ hint }: { hint: string }) {
  return <span className="inline-block min-w-[2.25rem] mr-2 font-medium text-gray-400 tabular-nums">{hint}</span>
}

/**
 * Styled replacement for a native <select>: a combobox button plus a listbox
 * popover, so the open list matches the app instead of the OS default.
 */
export default function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder = 'Select…',
  size = 'md',
  className = '',
  id,
  onBlur,
  'aria-label': ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const selectedIndex = options.findIndex((o) => o.value === value)
  const selected = options[selectedIndex]

  const close = useCallback(() => setOpen(false), [])
  useOnClickOutside(rootRef, close)

  // Keep the highlighted option scrolled into view during keyboard navigation
  useEffect(() => {
    if (open && active >= 0) listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  function openList() {
    setActive(Math.max(selectedIndex, 0))
    setOpen(true)
  }

  function choose(i: number) {
    onChange(options[i].value)
    setOpen(false)
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openList()
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); setActive((i) => Math.min(i + 1, options.length - 1)); break
      case 'ArrowUp':   e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); break
      case 'Home':      e.preventDefault(); setActive(0); break
      case 'End':       e.preventDefault(); setActive(options.length - 1); break
      case 'Enter':
      case ' ':         e.preventDefault(); if (active >= 0) choose(active); break
      case 'Escape':    e.preventDefault(); setOpen(false); break
      case 'Tab':       setOpen(false); break
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
        className={`field flex items-center justify-between gap-2 text-left active:scale-100 ${sizes[size].trigger} ${
          open ? 'bg-white border-navy-600 ring-4 ring-navy-600/10' : ''
        }`}
      >
        <span className={`truncate ${selected ? '' : 'text-gray-400'}`}>
          {selected?.hint && <OptionHint hint={selected.hint} />}
          {selected?.label ?? placeholder}
        </span>
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
          className="absolute z-30 mt-1.5 w-full min-w-max max-w-[calc(100vw-2rem)] max-h-60 overflow-y-auto rounded-[10px] bg-white p-1 shadow-xl ring-1 ring-black/5"
        >
          {options.map((o, i) => {
            const isSelected = o.value === value
            return (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                onMouseEnter={() => setActive(i)}
                // Keep focus on the trigger so keyboard nav still works after a click
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(i)}
                className={`flex items-center justify-between gap-3 rounded-md cursor-pointer ${sizes[size].option} ${
                  i === active ? 'bg-navy-50 text-navy-700' : 'text-gray-700'
                } ${isSelected ? 'font-medium' : ''}`}
              >
                <span className="truncate">
                  {o.hint && <OptionHint hint={o.hint} />}
                  {o.label}
                </span>
                {isSelected && (
                  <svg className="h-4 w-4 flex-shrink-0 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.25}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

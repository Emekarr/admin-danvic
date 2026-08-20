'use client'

import { useState } from 'react'
import { Button, Input } from '@danvic/ui'
import { Search, X } from 'lucide-react'

export function DirectorySearch({
  query,
  onQueryChange,
  placeholder,
}: {
  query: string
  onQueryChange: (query: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(Boolean(query))

  if (!open) {
    return (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        aria-expanded={false}
        aria-label={`Open ${placeholder.toLowerCase()}`}
        onClick={() => setOpen(true)}
      >
        <Search aria-hidden="true" /> {placeholder}
      </Button>
    )
  }

  return (
    <div className="ad-list-tools" role="search">
      <div className="ad-search-control">
        <Search aria-hidden="true" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              onQueryChange('')
              setOpen(false)
            }
          }}
        />
        <button
          type="button"
          className="ad-search-clear"
          aria-label="Close search"
          onClick={() => {
            onQueryChange('')
            setOpen(false)
          }}
        >
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

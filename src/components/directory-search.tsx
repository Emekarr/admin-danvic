'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button, Input } from '@danvic/ui'
import { Search, X } from 'lucide-react'

export function DirectorySearch({
  query,
  clearHref,
  placeholder,
}: {
  query: string
  clearHref: string
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
    <form className="ad-list-tools" method="get" role="search">
      <div className="ad-search-control">
        <Search aria-hidden="true" />
        <Input
          name="q"
          defaultValue={query}
          placeholder={placeholder}
          aria-label={placeholder}
          autoFocus
          onKeyDown={(event) => {
            if (event.key === 'Escape') setOpen(false)
          }}
        />
        {query ? (
          <Link className="ad-search-clear" href={clearHref} aria-label="Clear search">
            <X aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <Button type="submit" size="sm" variant="secondary">
        Search
      </Button>
    </form>
  )
}

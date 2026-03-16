import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLoaderData } from '@tanstack/react-router'
import { Search, ShoppingBag } from 'lucide-react'
import {
  Button,
  CardSkeleton,
  EmptyState,
  GeneralError,
  Input,
  LoadMoreTrigger,
  Main,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mochi/common'
import type { Category, Listing } from '@/types'
import {
  CONDITIONS,
  DELIVERY_METHODS,
  LISTING_TYPES,
  PRICING_MODELS,
  SORT_OPTIONS,
} from '@/config/constants'
import { ListingCardFromSearch } from '@/components/shared/listing-card'
import { listingsApi } from '@/api/listings'

export function SearchPage() {
  const { results, categories, error } = useLoaderData({
    from: '/_authenticated/search',
  })
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const searchParamsRef = useRef<Record<string, unknown>>({})

  // Sync loader data into state when filters/query change
  useEffect(() => {
    if (results) {
      setAllListings(results.listings)
      setPage(1)
      setHasMore(results.listings.length < results.total)
      // Capture current search params from the URL for subsequent pages
      const params = new URLSearchParams(window.location.search)
      const search: Record<string, unknown> = {}
      for (const [k, v] of params.entries()) {
        search[k] = v
      }
      searchParamsRef.current = search
    }
  }, [results])

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return
    setIsLoadingMore(true)
    const nextPage = page + 1
    try {
      const data = await listingsApi.search({
        ...searchParamsRef.current,
        page: nextPage,
        limit: 24,
      })
      setAllListings((prev) => [...prev, ...data.listings])
      setPage(nextPage)
      setHasMore(data.listings.length > 0 && allListings.length + data.listings.length < data.total)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page, allListings.length])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({
      to: '/search',
      search: (prev) => ({ ...prev, query: query || undefined }),
    })
  }

  function setFilter(key: string, value: string | undefined) {
    navigate({
      to: '/search',
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
      }),
    })
  }

  const total = results?.total ?? 0

  return (
    <>
      <PageHeader icon={<Search className='size-4 md:size-5' />} title='Search' />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}

        <div className='mb-6 space-y-4'>
          <form onSubmit={handleSearch} className='flex gap-2'>
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className='max-w-md'
            />
            <Button type='submit' size='sm'>
              <Search className='size-4' />
              Search
            </Button>
          </form>

          <div className='flex flex-wrap gap-2'>
            {categories && categories.length > 0 && (
              <Select onValueChange={(v) => setFilter('category', v === 'all' ? undefined : v)}>
                <SelectTrigger className='w-[160px]'>
                  <SelectValue placeholder='Category' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>All categories</SelectItem>
                  {categories.map((cat: Category) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select onValueChange={(v) => setFilter('type', v === 'all' ? undefined : v)}>
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Type' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All types</SelectItem>
                {LISTING_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setFilter('condition', v === 'all' ? undefined : v)}>
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Condition' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All conditions</SelectItem>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setFilter('pricing', v === 'all' ? undefined : v)}>
              <SelectTrigger className='w-[160px]'>
                <SelectValue placeholder='Pricing' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All pricing</SelectItem>
                {PRICING_MODELS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select onValueChange={(v) => setFilter('delivery', v === 'all' ? undefined : v)}>
              <SelectTrigger className='w-[140px]'>
                <SelectValue placeholder='Delivery' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All delivery</SelectItem>
                {DELIVERY_METHODS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              defaultValue='recent'
              onValueChange={(v) => setFilter('sort', v)}
            >
              <SelectTrigger className='w-[160px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!results ? (
          <CardSkeleton count={6} />
        ) : allListings.length === 0 ? (
          <EmptyState icon={ShoppingBag} title='No listings found' />
        ) : (
          <>
            <p className='mb-4 text-sm text-muted-foreground'>
              {total} result{total !== 1 ? 's' : ''}
            </p>
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {allListings.map((listing: Listing) => (
                <ListingCardFromSearch
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
            <LoadMoreTrigger
              hasMore={hasMore}
              isLoading={isLoadingMore}
              onLoadMore={loadMore}
            />
          </>
        )}
      </Main>
    </>
  )
}

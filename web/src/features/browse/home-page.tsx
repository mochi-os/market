import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLoaderData, useNavigate } from '@tanstack/react-router'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpDown,
  Box,
  Layers,
  Search,
  ShoppingBag,
  Sparkles,
  Tag,
  Truck,
  Wallet,
  X,
} from 'lucide-react'
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
  usePageTitle,
} from '@mochi/web'
import type { Category, Listing } from '@/types'
import {
  CONDITIONS,
  DELIVERY_METHODS,
  LISTING_TYPE_FILTERS,
  PRICING_MODELS,
  SORT_OPTIONS,
} from '@/config/constants'
import { listingsApi } from '@/api/listings'
import { APP_ROUTES } from '@/config/routes'
import { ListingCardFromSearch } from '@/components/shared/listing-card'

type FilterKey =
  | 'category'
  | 'type'
  | 'condition'
  | 'pricing'
  | 'delivery'
  | 'sort'
  | 'query'

const ALL = 'all'

export function HomePage() {
  const { t } = useLingui()
  usePageTitle(t`Market`)
  const { results, categories, error } = useLoaderData({
    from: '/_authenticated/',
  })
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const searchParamsRef = useRef<Record<string, unknown>>({})

  useEffect(() => {
    if (results) {
      setAllListings(results.listings)
      setPage(1)
      setHasMore(results.listings.length < results.total)
      const params = new URLSearchParams(window.location.search)
      const search: Record<string, unknown> = {}
      for (const [k, v] of params.entries()) {
        search[k] = v
      }
      searchParamsRef.current = search
      setQuery((search.query as string) ?? '')
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
      setHasMore(
        data.listings.length > 0 &&
          allListings.length + data.listings.length < data.total,
      )
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page, allListings.length])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, query: query || undefined }),
    })
  }

  function setFilter(key: FilterKey, value: string | undefined) {
    navigate({
      to: '/',
      search: (prev) => ({
        ...prev,
        [key]: value || undefined,
      }),
    })
  }

  function clearAll() {
    setQuery('')
    navigate({ to: '/', search: {} })
  }

  const params = useMemo(
    () =>
      new URLSearchParams(
        typeof window !== 'undefined' ? window.location.search : '',
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [results],
  )
  const total = results?.total ?? 0

  const activeFilters = useMemo(() => {
    const list: { key: FilterKey; label: string; value: string }[] = []
    const q = params.get('query')
    if (q) list.push({ key: 'query', label: t`Search`, value: q })
    const cat = params.get('category')
    if (cat) {
      const found = categories?.find((c: Category) => String(c.id) === cat)
      list.push({ key: 'category', label: t`Category`, value: found?.name ?? cat })
    }
    const ty = params.get('type')
    if (ty) {
      const f = LISTING_TYPE_FILTERS.find((x) => x.value === ty)
      list.push({ key: 'type', label: t`Type`, value: f?.label ?? ty })
    }
    const c = params.get('condition')
    if (c) {
      const f = CONDITIONS.find((x) => x.value === c)
      list.push({ key: 'condition', label: t`Condition`, value: f?.label ?? c })
    }
    const p = params.get('pricing')
    if (p) {
      const f = PRICING_MODELS.find((x) => x.value === p)
      list.push({ key: 'pricing', label: t`Pricing`, value: f?.label ?? p })
    }
    const d = params.get('delivery')
    if (d) {
      const f = DELIVERY_METHODS.find((x) => x.value === d)
      list.push({ key: 'delivery', label: t`Delivery`, value: f?.label ?? d })
    }
    return list
  }, [categories, params, t])

  const hasFilters = activeFilters.length > 0
  const sortValue = params.get('sort') ?? 'recent'

  function clearOne(key: FilterKey) {
    if (key === 'query') setQuery('')
    setFilter(key, undefined)
  }

  return (
    <>
      <PageHeader
        icon={<ShoppingBag className='size-4 md:size-5' />}
        title={t`Market`}
      />
      <Main>
        {error && <GeneralError error={error} minimal mode='inline' />}

        {/* Search hero */}
        <section className='mb-5'>
          <form
            onSubmit={handleSearch}
            className='flex items-center gap-2'
          >
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t`Search listings, categories, sellers`}
                className='h-11 pl-10 pr-10 text-sm'
              />
              {query && (
                <button
                  type='button'
                  aria-label='Clear search'
                  onClick={() => setQuery('')}
                  className='absolute right-2 top-1/2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-hover hover:text-foreground'
                >
                  <X className='size-4' />
                </button>
              )}
            </div>
            <Button
              type='submit'
              aria-label='Search'
              className='h-11 shrink-0 px-3 sm:px-5'
            >
              <Search className='size-4' />
              <span className='hidden sm:inline'><Trans>Search</Trans></span>
            </Button>
          </form>
        </section>

        {/* Filters */}
        <section className='mb-5 space-y-3'>
          <div className='flex flex-wrap items-center gap-2'>
            {categories && categories.length > 0 && (
              <FilterSelect
                icon={<Layers className='size-3.5' />}
                placeholder={t`Category`}
                value={params.get('category') ?? undefined}
                width='w-[170px]'
                onChange={(v) => setFilter('category', v)}
                options={categories.map((c: Category) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
              />
            )}
            <FilterSelect
              icon={<Box className='size-3.5' />}
              placeholder={t`Type`}
              value={params.get('type') ?? undefined}
              width='w-[140px]'
              onChange={(v) => setFilter('type', v)}
              options={LISTING_TYPE_FILTERS.map((t) => ({
                value: t.value,
                label: t.label,
              }))}
            />
            <FilterSelect
              icon={<Sparkles className='size-3.5' />}
              placeholder={t`Condition`}
              value={params.get('condition') ?? undefined}
              width='w-[150px]'
              onChange={(v) => setFilter('condition', v)}
              options={CONDITIONS.map((c) => ({ value: c.value, label: c.label }))}
            />
            <FilterSelect
              icon={<Wallet className='size-3.5' />}
              placeholder={t`Pricing`}
              value={params.get('pricing') ?? undefined}
              width='w-[170px]'
              onChange={(v) => setFilter('pricing', v)}
              options={PRICING_MODELS.map((p) => ({
                value: p.value,
                label: p.label,
              }))}
            />
            <FilterSelect
              icon={<Truck className='size-3.5' />}
              placeholder={t`Delivery`}
              value={params.get('delivery') ?? undefined}
              width='w-[150px]'
              onChange={(v) => setFilter('delivery', v)}
              options={DELIVERY_METHODS.map((d) => ({
                value: d.value,
                label: d.label,
              }))}
            />

            <div className='ml-auto flex items-center gap-2'>
              <Select
                value={sortValue}
                onValueChange={(v) => setFilter('sort', v)}
              >
                <SelectTrigger className='h-9 w-[170px]'>
                  <ArrowUpDown className='size-3.5 text-muted-foreground' />
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

          {hasFilters && (
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-xs text-muted-foreground'>
                {total} result{total !== 1 ? 's' : ''}
              </span>
              <span className='h-3 w-px bg-border' />
              {activeFilters.map((f) => (
                <span
                  key={f.key}
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2.5 py-0.5 text-xs font-medium'
                >
                  <span className='text-muted-foreground'>{f.label}:</span>
                  <span className='max-w-[140px] truncate'>{f.value}</span>
                  <button
                    type='button'
                    aria-label={`Remove ${f.label} filter`}
                    onClick={() => clearOne(f.key)}
                    className='ml-0.5 inline-flex size-4 items-center justify-center rounded-full transition-colors hover:bg-destructive/15 hover:text-destructive'
                  >
                    <X className='size-3' />
                  </button>
                </span>
              ))}
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-7 text-xs text-muted-foreground'
                onClick={clearAll}
              >
                <Trans>Clear all</Trans>
              </Button>
            </div>
          )}
        </section>

        {/* Categories */}
        {!hasFilters && categories && categories.length > 0 && (
          <section className='mb-8 hidden md:block'>
            <div className='mb-3 flex items-end justify-between'>
              <h2 className='text-base font-semibold'><Trans>Browse categories</Trans></h2>
              <span className='text-xs text-muted-foreground'>
                {categories.length} categor
                {categories.length === 1 ? 'y' : 'ies'}
              </span>
            </div>
            <div className='grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
              {categories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  to={APP_ROUTES.HOME}
                  search={{ category: cat.id }}
                  className='group focus-visible:outline-none'
                >
                  <div className='flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-ring/40'>
                    <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15'>
                      <Tag className='size-4' />
                    </span>
                    <span className='truncate text-sm font-medium'>
                      {cat.name}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Listings */}
        <section>
          <div className='mb-3 flex items-end justify-between'>
            <h2 className='text-base font-semibold'>
              {hasFilters ? <Trans>Results</Trans> : <Trans>Recent listings</Trans>}
            </h2>
            {!hasFilters && results && (
              <span className='text-xs text-muted-foreground'>
                {total} listing{total !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {!results ? (
            <CardSkeleton count={6} />
          ) : allListings.length === 0 ? (
            <div className='rounded-lg border border-dashed border-border bg-card/40 py-10'>
              <EmptyState
                icon={ShoppingBag}
                title={hasFilters ? t`No listings found` : t`No listings yet`}
                description={
                  hasFilters
                    ? t`Try adjusting or clearing your filters`
                    : undefined
                }
              />
              {hasFilters && (
                <div className='mt-2 flex justify-center'>
                  <Button variant='outline' size='sm' onClick={clearAll}>
                    <Trans>Clear filters</Trans>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
                {allListings.map((listing: Listing, i: number) => (
                  <div
                    key={listing.id}
                    className='animate-in fade-in slide-in-from-bottom-2 duration-300'
                    style={{
                      animationDelay: `${Math.min(i, 11) * 30}ms`,
                      animationFillMode: 'both',
                    }}
                  >
                    <ListingCardFromSearch listing={listing} />
                  </div>
                ))}
              </div>
              <LoadMoreTrigger
                hasMore={hasMore}
                isLoading={isLoadingMore}
                onLoadMore={loadMore}
              />
            </>
          )}
        </section>
      </Main>
    </>
  )
}

function FilterSelect({
  icon,
  placeholder,
  value,
  onChange,
  options,
  width,
}: {
  icon: React.ReactNode
  placeholder: string
  value: string | undefined
  onChange: (value: string | undefined) => void
  options: { value: string; label: string }[]
  width: string
}) {
  const isActive = !!value
  return (
    <Select
      value={value ?? ALL}
      onValueChange={(v) => onChange(v === ALL ? undefined : v)}
    >
      <SelectTrigger
        className={`h-9 ${width} ${
          isActive
            ? 'border-primary/50 bg-primary/5 text-foreground'
            : ''
        }`}
      >
        <span
          className={
            isActive
              ? 'text-primary'
              : 'text-muted-foreground'
          }
        >
          {icon}
        </span>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

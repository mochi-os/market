import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpDown,
  Box,
  ChevronDown,
  DollarSign,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
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
import {
  getRecentlyViewed,
  clearRecentlyViewed,
} from '@/lib/recently-viewed'

type FilterKey = 'category' | 'type' | 'condition' | 'pricing' | 'delivery' | 'query' | 'price'

const TYPE_OPTIONS = LISTING_TYPE_FILTERS.map((x) => ({ value: x.value, label: x.label }))
const CONDITION_OPTIONS = CONDITIONS.map((c) => ({ value: c.value, label: c.label }))
const PRICING_OPTIONS = PRICING_MODELS.map((p) => ({ value: p.value, label: p.label }))
const DELIVERY_OPTIONS = DELIVERY_METHODS.map((d) => ({ value: d.value, label: d.label }))

interface ActiveFilter {
  key: FilterKey
  rawValue: string
  displayLabel: string
}

function parseMulti(s: string | undefined | null): string[] {
  if (!s) return []
  return s.split(',').filter(Boolean)
}

function serializeMulti(arr: string[]): string | undefined {
  return arr.length > 0 ? arr.join(',') : undefined
}

export function HomePage() {
  const { t } = useLingui()
  usePageTitle(t`Market`)
  const { results, categories, error } = useLoaderData({
    from: '/_authenticated/',
  })
  const routeSearch = useSearch({ from: '/_authenticated/' })
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceOpen, setPriceOpen] = useState(false)
  const [allListings, setAllListings] = useState<Listing[]>([])
  const [recentlyViewed, setRecentlyViewed] = useState<Listing[]>([])
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
      setMinPrice(search.min ? String(search.min) : '')
      setMaxPrice(search.max ? String(search.max) : '')
      setRecentlyViewed(getRecentlyViewed())
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
      setAllListings((prev) => {
        const next = [...prev, ...data.listings]
        setHasMore(data.listings.length > 0 && next.length < data.total)
        return next
      })
      setPage(nextPage)
    } finally {
      setIsLoadingMore(false)
    }
  }, [isLoadingMore, hasMore, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, query: query || undefined }),
    })
  }

  function toggleFilter(key: FilterKey, value: string) {
    const current = routeSearch[key as keyof typeof routeSearch] as string | undefined
    // Comptroller accepts only a single value per filter; selecting the same
    // value again clears it, selecting a different value replaces it.
    const next = current === value ? undefined : value
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, [key]: next }),
    })
  }

  function clearFilter(key: FilterKey) {
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, [key]: undefined }),
    })
  }

  function applyPriceRange() {
    setPriceOpen(false)
    navigate({
      to: '/',
      search: (prev) => ({
        ...prev,
        min: minPrice ? Number(minPrice) : undefined,
        max: maxPrice ? Number(maxPrice) : undefined,
      }),
    })
  }

  function clearAll() {
    setQuery('')
    setMinPrice('')
    setMaxPrice('')
    navigate({ to: '/', search: {} })
  }

  function removeFilter(key: FilterKey, rawValue: string) {
    if (key === 'query') {
      setQuery('')
      navigate({ to: '/', search: (prev) => ({ ...prev, query: undefined }) })
      return
    }
    if (key === 'price') {
      setMinPrice('')
      setMaxPrice('')
      navigate({ to: '/', search: (prev) => ({ ...prev, min: undefined, max: undefined }) })
      return
    }
    const current = routeSearch[key as keyof typeof routeSearch] as string | undefined
    const arr = parseMulti(current).filter((v) => v !== rawValue)
    navigate({
      to: '/',
      search: (prev) => ({ ...prev, [key]: serializeMulti(arr) }),
    })
  }

  const total = results?.total ?? 0
  const sortValue = routeSearch.sort ?? 'recent'
  const priceActive = !!(routeSearch.min || routeSearch.max)

  const selectedCategories = useMemo(() => parseMulti(routeSearch.category), [routeSearch.category])
  const selectedTypes = useMemo(() => parseMulti(routeSearch.type), [routeSearch.type])
  const selectedConditions = useMemo(() => parseMulti(routeSearch.condition), [routeSearch.condition])
  const selectedPricing = useMemo(() => parseMulti(routeSearch.pricing), [routeSearch.pricing])
  const selectedDelivery = useMemo(() => parseMulti(routeSearch.delivery), [routeSearch.delivery])

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = []
    if (routeSearch.query) {
      list.push({ key: 'query', rawValue: routeSearch.query, displayLabel: `"${routeSearch.query}"` })
    }
    selectedCategories.forEach((id) => {
      const found = categories?.find((c: Category) => String(c.id) === id)
      list.push({ key: 'category', rawValue: id, displayLabel: found?.name ?? id })
    })
    selectedTypes.forEach((v) => {
      const f = LISTING_TYPE_FILTERS.find((x) => x.value === v)
      list.push({ key: 'type', rawValue: v, displayLabel: f?.label ?? v })
    })
    selectedConditions.forEach((v) => {
      const f = CONDITIONS.find((x) => x.value === v)
      list.push({ key: 'condition', rawValue: v, displayLabel: f?.label ?? v })
    })
    selectedPricing.forEach((v) => {
      const f = PRICING_MODELS.find((x) => x.value === v)
      list.push({ key: 'pricing', rawValue: v, displayLabel: f?.label ?? v })
    })
    selectedDelivery.forEach((v) => {
      const f = DELIVERY_METHODS.find((x) => x.value === v)
      list.push({ key: 'delivery', rawValue: v, displayLabel: f?.label ?? v })
    })
    if (priceActive) {
      const mn = routeSearch.min
      const mx = routeSearch.max
      const label = mn && mx ? `${mn}–${mx}` : mn ? `≥${mn}` : `≤${mx}`
      list.push({ key: 'price', rawValue: 'price', displayLabel: label ?? '' })
    }
    return list
  }, [
    routeSearch.query,
    routeSearch.min,
    routeSearch.max,
    selectedCategories,
    selectedTypes,
    selectedConditions,
    selectedPricing,
    selectedDelivery,
    categories,
    priceActive,
  ])

  const hasFilters = activeFilters.length > 0

  const categoryOptions = useMemo(
    () => categories?.map((c: Category) => ({ value: String(c.id), label: c.name })) ?? [],
    [categories],
  )

  const visibleRecent = useMemo(
    () => recentlyViewed.filter((r) => !allListings.some((l) => l.id === r.id)),
    [recentlyViewed, allListings],
  )

  const emptyTitle = useMemo(() => {
    if (!hasFilters || !results || allListings.length > 0) return t`No listings found`
    const cat = activeFilters.find((f) => f.key === 'category')
    const type = activeFilters.find((f) => f.key === 'type')
    const pricing = activeFilters.find((f) => f.key === 'pricing')
    const query = activeFilters.find((f) => f.key === 'query')
    const primary = type ?? pricing
    if (query && cat) return t`No results for "${query.rawValue}" in ${cat.displayLabel}`
    if (query) return t`No results for "${query.rawValue}"`
    if (primary && cat) return t`No ${primary.displayLabel} listings in ${cat.displayLabel}`
    if (cat) return t`No listings in ${cat.displayLabel}`
    if (primary) return t`No ${primary.displayLabel} listings`
    return t`No listings found`
  }, [hasFilters, results, allListings.length, activeFilters, t])

  return (
    <>
      <PageHeader
        icon={<ShoppingBag className='size-4 md:size-5' />}
        title={t`Market`}
      />
      <Main>
        {error && <GeneralError error={error} minimal mode='inline' />}

        {/* Search + filters */}
        <section className='mb-4 space-y-2'>
          {/* Search row */}
          <form onSubmit={handleSearch} className='flex items-center gap-2'>
            <div className='relative flex-1'>
              <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t`Search listings, categories, sellers`}
                className='h-9 pl-10 pr-9 text-sm'
              />
              {query && (
                <button
                  type='button'
                  aria-label={t`Clear search`}
                  onClick={() => setQuery('')}
                  className='absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover hover:text-foreground'
                >
                  <X className='size-3.5' />
                </button>
              )}
            </div>
            <Button
              type='submit'
              aria-label={t`Search`}
              className='h-11 shrink-0 px-3 sm:px-5'
            >
              <Search className='size-4' />
              <span className='ml-1.5 hidden sm:inline'>
                <Trans>Search</Trans>
              </span>
            </Button>
          </form>

          {/* Filter row */}
          <div className='flex items-center gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
            {categoryOptions.length > 0 && (
              <FilterMultiSelect
                icon={<Layers className='size-3.5' />}
                label={t`Category`}
                values={selectedCategories}
                options={categoryOptions}
                onToggle={(v) => toggleFilter('category', v)}
                onClear={() => clearFilter('category')}
              />
            )}
            <FilterMultiSelect
              icon={<Box className='size-3.5' />}
              label={t`Type`}
              values={selectedTypes}
              options={TYPE_OPTIONS}
              onToggle={(v) => toggleFilter('type', v)}
              onClear={() => clearFilter('type')}
            />
            <FilterMultiSelect
              icon={<Sparkles className='size-3.5' />}
              label={t`Condition`}
              values={selectedConditions}
              options={CONDITION_OPTIONS}
              onToggle={(v) => toggleFilter('condition', v)}
              onClear={() => clearFilter('condition')}
            />
            <FilterMultiSelect
              icon={<Wallet className='size-3.5' />}
              label={t`Pricing`}
              values={selectedPricing}
              options={PRICING_OPTIONS}
              onToggle={(v) => toggleFilter('pricing', v)}
              onClear={() => clearFilter('pricing')}
            />
            <FilterMultiSelect
              icon={<Truck className='size-3.5' />}
              label={t`Delivery`}
              values={selectedDelivery}
              options={DELIVERY_OPTIONS}
              onToggle={(v) => toggleFilter('delivery', v)}
              onClear={() => clearFilter('delivery')}
            />

            {/* Price range */}
            <Popover open={priceOpen} onOpenChange={setPriceOpen}>
              <PopoverTrigger asChild>
                <button
                  type='button'
                  className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
                    priceActive
                      ? 'border-primary/50 bg-primary/5 text-foreground'
                      : 'border-input bg-background text-muted-foreground hover:bg-accent'
                  }`}
                >
                  <DollarSign
                    className={`size-3.5 shrink-0 ${priceActive ? 'text-primary' : ''}`}
                  />
                  <span>
                    {priceActive
                      ? minPrice && maxPrice
                        ? `${minPrice}–${maxPrice}`
                        : minPrice
                          ? `≥${minPrice}`
                          : `≤${maxPrice}`
                      : t`Price`}
                  </span>
                  {priceActive && (
                    <span
                      role='button'
                      tabIndex={0}
                      aria-label={t`Clear price filter`}
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFilter('price', 'price')
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation()
                          removeFilter('price', 'price')
                        }
                      }}
                      className='inline-flex size-4 items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive'
                    >
                      <X className='size-2.5' />
                    </span>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className='w-52 p-3' align='start'>
                <p className='mb-2 text-xs font-medium'>
                  <Trans>Price range</Trans>
                </p>
                <div className='flex items-center gap-2'>
                  <Input
                    type='number'
                    min={0}
                    placeholder={t`Min`}
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className='h-8 text-xs'
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
                  />
                  <span className='text-muted-foreground'>–</span>
                  <Input
                    type='number'
                    min={0}
                    placeholder={t`Max`}
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className='h-8 text-xs'
                    onKeyDown={(e) => e.key === 'Enter' && applyPriceRange()}
                  />
                </div>
                <div className='mt-2 flex gap-2'>
                  <Button
                    size='sm'
                    className='h-7 flex-1 text-xs'
                    onClick={applyPriceRange}
                  >
                    <Trans>Apply</Trans>
                  </Button>
                  {priceActive && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 text-xs'
                      onClick={() => removeFilter('price', 'price')}
                    >
                      <Trans>Clear</Trans>
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* Sort — right-aligned */}
            <div className='ml-auto shrink-0'>
              <Select
                value={sortValue}
                onValueChange={(v) =>
                  navigate({
                    to: '/',
                    search: (prev) => ({
                      ...prev,
                      sort: v === 'recent' ? undefined : v,
                    }),
                  })
                }
              >
                <SelectTrigger className='h-8 w-auto gap-1 border-none bg-transparent pr-1 text-xs text-muted-foreground shadow-none focus:ring-0'>
                  <ArrowUpDown className='size-3.5' />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align='end'>
                  {SORT_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter chips */}
          {hasFilters && (
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='text-xs text-muted-foreground'>
                <Plural value={total} one='# result' other='# results' />
              </span>
              <span className='h-3 w-px bg-border' />
              {activeFilters.map((f) => (
                <span
                  key={`${f.key}:${f.rawValue}`}
                  className='inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium'
                >
                  <span className='max-w-[140px] truncate'>{f.displayLabel}</span>
                  <button
                    type='button'
                    aria-label={t`Remove ${f.displayLabel} filter`}
                    onClick={() => removeFilter(f.key, f.rawValue)}
                    className='ml-0.5 inline-flex size-4 items-center justify-center rounded-full transition-colors hover:bg-destructive/15 hover:text-destructive'
                  >
                    <X className='size-2.5' />
                  </button>
                </span>
              ))}
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 px-2 text-xs text-muted-foreground'
                onClick={clearAll}
              >
                <Trans>Clear all</Trans>
              </Button>
            </div>
          )}
        </section>

        {/* Recently viewed */}
        {!hasFilters && visibleRecent.length > 0 && (
          <section className='mb-8'>
            <div className='mb-3 flex items-center justify-between'>
              <h2 className='text-base font-semibold'>
                <Trans>Recently viewed</Trans>
              </h2>
              <button
                type='button'
                className='text-xs text-muted-foreground hover:text-foreground'
                onClick={() => {
                  clearRecentlyViewed()
                  setRecentlyViewed([])
                }}
              >
                <Trans>Clear</Trans>
              </button>
            </div>
            <div className='flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
              {visibleRecent.map((listing) => (
                <div key={listing.id} className='w-40 shrink-0'>
                  <ListingCardFromSearch listing={listing} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Categories */}
        {!hasFilters && categories && categories.length > 0 && (
          <section className='mb-8 hidden md:block'>
            <div className='mb-3 flex items-end justify-between'>
              <h2 className='text-base font-semibold'>
                <Trans>Browse categories</Trans>
              </h2>
              <span className='text-xs text-muted-foreground'>
                <Plural
                  value={categories.length}
                  one='# category'
                  other='# categories'
                />
              </span>
            </div>
            <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'>
              {categories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  to={APP_ROUTES.HOME}
                  search={{ category: String(cat.id) }}
                  className='group focus-visible:outline-none'
                >
                  <div className='flex h-full items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2.5 transition-[transform,border-color,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 group-active:translate-y-0 group-focus-visible:ring-2 group-focus-visible:ring-ring/40'>
                    <span className='inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary/15'>
                      <Tag className='size-4' />
                    </span>
                    <span className='truncate text-sm font-medium'>{cat.name}</span>
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
                <Plural value={total} one='# listing' other='# listings' />
              </span>
            )}
          </div>
          {!results ? (
            <CardSkeleton count={6} />
          ) : allListings.length === 0 ? (
            <div className='rounded-lg border border-dashed border-border bg-card/40 py-10'>
              <EmptyState
                icon={ShoppingBag}
                title={hasFilters ? emptyTitle : t`No listings yet`}
                description={
                  hasFilters ? t`Try adjusting or clearing your filters` : undefined
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
                    className='animate-in fade-in slide-in-from-bottom-2 h-full duration-300'
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

function FilterMultiSelect({
  icon,
  label,
  values,
  options,
  onToggle,
  onClear,
}: {
  icon: React.ReactNode
  label: string
  values: string[]
  options: { value: string; label: string }[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const isActive = values.length > 0
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type='button'
          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors ${
            isActive
              ? 'border-primary/50 bg-primary/5 text-foreground'
              : 'border-input bg-background text-muted-foreground hover:bg-accent'
          }`}
        >
          <span className={isActive ? 'text-primary' : ''}>{icon}</span>
          <span className='max-w-[90px] truncate'>{label}</span>
          <ChevronDown className='size-3 text-muted-foreground/70' />
        </button>
      </PopoverTrigger>
      <PopoverContent className='w-48 p-1.5' align='start'>
        <div className='max-h-60 overflow-y-auto'>
          {options.map((opt) => {
            const checked = values.includes(opt.value)
            return (
              <div
                key={opt.value}
                role='menuitemradio'
                aria-checked={checked}
                className='flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-1.5 text-sm hover:bg-accent'
                onClick={() => onToggle(opt.value)}
              >
                <span className={`inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors ${checked ? 'border-primary bg-primary' : 'border-input bg-background'}`}>
                  {checked && <span className='size-1.5 rounded-full bg-primary-foreground' />}
                </span>
                <span className='flex-1 select-none leading-none'>{opt.label}</span>
              </div>
            )
          })}
        </div>
        {isActive && (
          <div className='mt-1 border-t border-border pt-1'>
            <button
              type='button'
              onClick={onClear}
              className='w-full rounded px-2.5 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
            >
              <Trans>Clear</Trans>
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}

// Copyright © 2026 Mochi OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { Plural, Trans, useLingui } from '@lingui/react/macro'
import {
  ArrowUpDown,
  Box,
  Check,
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  usePageTitle,
  toast,
  getErrorMessage,
} from '@mochi/web'
import type { Category, Listing } from '@/types'
import {
  useConditions,
  useCurrencies,
  useDeliveryMethods,
  useListingTypeFilters,
  usePricingModels,
  useSortOptions,
} from '@/config/constants'
import { fromMinorUnits, toMinorUnits } from '@/lib/format'
import { listingsApi } from '@/api/listings'
import { APP_ROUTES } from '@/config/routes'
import { ListingCardFromSearch } from '@/components/shared/listing-card'
import {
  getRecentlyViewed,
  clearRecentlyViewed,
  setRecentlyViewedList,
} from '@/lib/recently-viewed'
import { photosApi } from '@/api/photos'

type FilterKey = 'category' | 'type' | 'condition' | 'pricing' | 'delivery' | 'query' | 'price'

interface ActiveFilter {
  key: FilterKey
  rawValue: string
  displayLabel: string
}

// The "Browse categories" grid is hidden for now: with few listings it takes a
// lot of vertical space in the middle of the page for little value. Flip to
// `true` to bring it back once listing volume grows. The compact "Category"
// filter in the filter bar is unaffected and stays available.
const SHOW_CATEGORY_BROWSER = false

export function HomePage() {
  const { t } = useLingui()
  usePageTitle(t`Market`)
  const LISTING_TYPE_FILTERS = useListingTypeFilters()
  const CONDITIONS = useConditions()
  const PRICING_MODELS = usePricingModels()
  const DELIVERY_METHODS = useDeliveryMethods()
  const SORT_OPTIONS = useSortOptions()
  const CURRENCIES = useCurrencies()
  const TYPE_OPTIONS = useMemo(
    () => LISTING_TYPE_FILTERS.map((x) => ({ value: x.value, label: x.label })),
    [LISTING_TYPE_FILTERS],
  )
  const CONDITION_OPTIONS = useMemo(
    () => CONDITIONS.map((c) => ({ value: c.value, label: c.label })),
    [CONDITIONS],
  )
  const PRICING_OPTIONS = useMemo(
    () => PRICING_MODELS.map((p) => ({ value: p.value, label: p.label })),
    [PRICING_MODELS],
  )
  const DELIVERY_OPTIONS = useMemo(
    () => DELIVERY_METHODS.map((d) => ({ value: d.value, label: d.label })),
    [DELIVERY_METHODS],
  )
  const { results, categories, error } = useLoaderData({
    from: '/_authenticated/',
  })
  const routeSearch = useSearch({ from: '/_authenticated/' })
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [priceCurrency, setPriceCurrency] = useState('usd')
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
      // min/max are stored in the URL as minor units (matching the server's
      // price column); show them to the user in major units of the chosen
      // currency.
      const cur = (search.currency as string) || 'usd'
      setPriceCurrency(cur)
      setMinPrice(search.min ? String(fromMinorUnits(Number(search.min), cur)) : '')
      setMaxPrice(search.max ? String(fromMinorUnits(Number(search.max), cur)) : '')
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
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to load more listings`))
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
    const hasRange = !!(minPrice || maxPrice)
    navigate({
      to: '/',
      search: (prev) => ({
        ...prev,
        // Scope the range to a currency and store min/max in that currency's
        // minor units, so the server compares like-for-like against l.price.
        currency: hasRange ? priceCurrency : undefined,
        min: minPrice ? toMinorUnits(Number(minPrice), priceCurrency) : undefined,
        max: maxPrice ? toMinorUnits(Number(maxPrice), priceCurrency) : undefined,
      }),
    })
  }

  function clearAll() {
    setQuery('')
    setMinPrice('')
    setMaxPrice('')
    setPriceCurrency('usd')
    navigate({ to: '/', search: {} })
  }

  function removeFilter(key: FilterKey) {
    if (key === 'query') {
      setQuery('')
      navigate({ to: '/', search: (prev) => ({ ...prev, query: undefined }) })
      return
    }
    if (key === 'price') {
      setMinPrice('')
      setMaxPrice('')
      navigate({
        to: '/',
        search: (prev) => ({ ...prev, min: undefined, max: undefined, currency: undefined }),
      })
      return
    }
    navigate({ to: '/', search: (prev) => ({ ...prev, [key]: undefined }) })
  }

  const total = results?.total ?? 0
  const sortValue = routeSearch.sort ?? 'recent'
  const priceActive = !!(routeSearch.min || routeSearch.max)
  const priceSymbol = CURRENCIES.find((c) => c.value === priceCurrency)?.symbol ?? ''

  const activeFilters = useMemo<ActiveFilter[]>(() => {
    const list: ActiveFilter[] = []
    if (routeSearch.query) {
      list.push({ key: 'query', rawValue: routeSearch.query, displayLabel: `"${routeSearch.query}"` })
    }
    if (routeSearch.category) {
      const found = categories?.find((c: Category) => String(c.id) === routeSearch.category)
      list.push({ key: 'category', rawValue: routeSearch.category, displayLabel: found?.name ?? routeSearch.category })
    }
    if (routeSearch.type) {
      const f = LISTING_TYPE_FILTERS.find((x) => x.value === routeSearch.type)
      list.push({ key: 'type', rawValue: routeSearch.type, displayLabel: f?.label ?? routeSearch.type })
    }
    if (routeSearch.condition) {
      const f = CONDITIONS.find((x) => x.value === routeSearch.condition)
      list.push({ key: 'condition', rawValue: routeSearch.condition, displayLabel: f?.label ?? routeSearch.condition })
    }
    if (routeSearch.pricing) {
      const f = PRICING_MODELS.find((x) => x.value === routeSearch.pricing)
      list.push({ key: 'pricing', rawValue: routeSearch.pricing, displayLabel: f?.label ?? routeSearch.pricing })
    }
    if (routeSearch.delivery) {
      const f = DELIVERY_METHODS.find((x) => x.value === routeSearch.delivery)
      list.push({ key: 'delivery', rawValue: routeSearch.delivery, displayLabel: f?.label ?? routeSearch.delivery })
    }
    if (priceActive) {
      const cur = routeSearch.currency || 'usd'
      const sym = CURRENCIES.find((c) => c.value === cur)?.symbol ?? ''
      const mn = routeSearch.min != null ? `${sym}${fromMinorUnits(routeSearch.min, cur)}` : null
      const mx = routeSearch.max != null ? `${sym}${fromMinorUnits(routeSearch.max, cur)}` : null
      const label = mn && mx ? `${mn}–${mx}` : mn ? `≥${mn}` : `≤${mx}`
      list.push({ key: 'price', rawValue: 'price', displayLabel: label ?? '' })
    }
    return list
  }, [
    routeSearch.query,
    routeSearch.min,
    routeSearch.max,
    routeSearch.currency,
    CURRENCIES,
    routeSearch.category,
    routeSearch.type,
    routeSearch.condition,
    routeSearch.pricing,
    routeSearch.delivery,
    categories,
    priceActive,
    LISTING_TYPE_FILTERS,
    CONDITIONS,
    PRICING_MODELS,
    DELIVERY_METHODS,
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

  // Recently-viewed entries are client-side snapshots and go stale: a listing
  // can be removed or re-created with a new id (so the old snapshot lingers,
  // unmatched by the live grid), or it was stored before its photo was
  // captured. Once results are in, reconcile against live data — drop entries
  // whose listing no longer exists (404), and backfill the first photo for any
  // survivor that lacks one — so cards aren't stale or imageless. Runs once.
  const reconciledRef = useRef(false)
  useEffect(() => {
    if (reconciledRef.current || !results || recentlyViewed.length === 0) return
    reconciledRef.current = true
    let cancelled = false
    void (async () => {
      const reconciled = await Promise.all(
        recentlyViewed.map(async (entry) => {
          const inGrid = allListings.find((l) => l.id === entry.id)
          if (inGrid) return inGrid // refresh to live data (incl. photo)
          try {
            const live = await listingsApi.get(entry.id)
            // Drop entries that are no longer browseable — sold, expired, or
            // ended/scheduled auctions — so Recently viewed matches Recent
            // listings (the server browse requires status='active'). get()
            // self-heals a lapsed auction first, so this status is fresh.
            if (live.listing.status !== 'active') return null
          } catch (e) {
            const status = (e as { response?: { status?: number } })?.response?.status
            return status === 404 ? null : entry // only drop on a definitive 404
          }
          if (entry.photo) return entry
          try {
            const photos = await photosApi.list(entry.id)
            return photos.length > 0 ? { ...entry, photo: photos[0] } : entry
          } catch {
            return entry
          }
        }),
      )
      if (cancelled) return
      const cleaned = reconciled.filter((x): x is Listing => x != null)
      const changed =
        cleaned.length !== recentlyViewed.length ||
        cleaned.some((c, i) => c !== recentlyViewed[i])
      if (changed) {
        setRecentlyViewed(cleaned)
        setRecentlyViewedList(cleaned)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [results, recentlyViewed, allListings])

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
                className='pl-10 pr-9 text-sm'
              />
              {query && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      aria-label={t`Clear search`}
                      onClick={() => setQuery('')}
                      className='absolute right-2 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-hover hover:text-foreground'
                    >
                      <X className='size-3.5' />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t`Clear search`}</TooltipContent>
                </Tooltip>
              )}
            </div>
            <Button
              type='submit'
              aria-label={t`Search`}
              className='shrink-0'
            >
              <Search className='size-4' />
              <span className='ml-1.5 hidden sm:inline'>
                <Trans>Search</Trans>
              </span>
            </Button>
          </form>

          {/* Filter row */}
          <div
            className='flex items-center gap-1.5 overflow-x-auto pb-0.5 [mask-image:linear-gradient(to_right,black_0,black_calc(100%-2rem),transparent_100%)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          >
            {categoryOptions.length > 0 && (
              <FilterSelect
                icon={<Layers className='size-3.5' />}
                label={t`Category`}
                value={routeSearch.category}
                options={categoryOptions}
                onToggle={(v) => toggleFilter('category', v)}
                onClear={() => clearFilter('category')}
              />
            )}
            <FilterSelect
              icon={<Box className='size-3.5' />}
              label={t`Type`}
              value={routeSearch.type}
              options={TYPE_OPTIONS}
              onToggle={(v) => toggleFilter('type', v)}
              onClear={() => clearFilter('type')}
            />
            <FilterSelect
              icon={<Sparkles className='size-3.5' />}
              label={t`Condition`}
              value={routeSearch.condition}
              options={CONDITION_OPTIONS}
              onToggle={(v) => toggleFilter('condition', v)}
              onClear={() => clearFilter('condition')}
            />
            <FilterSelect
              icon={<Wallet className='size-3.5' />}
              label={t`Pricing`}
              value={routeSearch.pricing}
              options={PRICING_OPTIONS}
              onToggle={(v) => toggleFilter('pricing', v)}
              onClear={() => clearFilter('pricing')}
            />
            <FilterSelect
              icon={<Truck className='size-3.5' />}
              label={t`Delivery`}
              value={routeSearch.delivery}
              options={DELIVERY_OPTIONS}
              onToggle={(v) => toggleFilter('delivery', v)}
              onClear={() => clearFilter('delivery')}
            />

            {/* Price range */}
            <Popover open={priceOpen} onOpenChange={setPriceOpen}>
              <div
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border pl-2.5 text-xs transition-colors ${
                  priceActive
                    ? 'border-primary/50 bg-primary/5 text-foreground'
                    : 'border-input bg-background text-muted-foreground hover:bg-accent'
                } ${priceActive ? 'pr-1' : 'pr-2.5'}`}
              >
                <PopoverTrigger asChild>
                  <button
                    type='button'
                    aria-label={t`Price range`}
                    className='inline-flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/40 rounded'
                  >
                    <DollarSign
                      className={`size-3.5 shrink-0 ${priceActive ? 'text-primary' : ''}`}
                    />
                    <span>
                      {priceActive
                        ? minPrice && maxPrice
                          ? `${priceSymbol}${minPrice}–${priceSymbol}${maxPrice}`
                          : minPrice
                            ? `≥${priceSymbol}${minPrice}`
                            : `≤${priceSymbol}${maxPrice}`
                        : t`Price`}
                    </span>
                  </button>
                </PopoverTrigger>
                {priceActive && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        aria-label={t`Clear price filter`}
                        onClick={() => removeFilter('price')}
                        className='ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-destructive/15 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
                      >
                        <X className='size-2.5' />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t`Clear price filter`}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <PopoverContent className='w-52 p-3' align='start'>
                <p className='mb-2 text-xs font-medium'>
                  <Trans>Price range</Trans>
                </p>
                <Select value={priceCurrency} onValueChange={setPriceCurrency}>
                  <SelectTrigger className='mb-2 h-8 text-xs'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.symbol} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Check className='size-4' />
                    <Trans>Apply</Trans>
                  </Button>
                  {priceActive && (
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 text-xs'
                      onClick={() => removeFilter('price')}
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
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        aria-label={t`Remove ${f.displayLabel} filter`}
                        onClick={() => removeFilter(f.key)}
                        className='ml-0.5 inline-flex size-4 items-center justify-center rounded-full transition-colors hover:bg-destructive/15 hover:text-destructive'
                      >
                        <X className='size-2.5' />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{t`Remove ${f.displayLabel} filter`}</TooltipContent>
                  </Tooltip>
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
          <ListingStrip
            heading={<Trans>Recently viewed</Trans>}
            listings={visibleRecent}
            onClear={() => {
              clearRecentlyViewed()
              setRecentlyViewed([])
            }}
          />
        )}

        {/* Categories */}
        {SHOW_CATEGORY_BROWSER && !hasFilters && categories && categories.length > 0 && (
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
          {error ? null : allListings.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={hasFilters ? emptyTitle : t`No listings yet`}
              description={
                hasFilters ? t`Try adjusting or clearing your filters` : undefined
              }
            >
              {hasFilters && (
                <Button variant='outline' size='sm' onClick={clearAll}>
                  <Trans>Clear filters</Trans>
                </Button>
              )}
            </EmptyState>
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

function ListingStrip({
  heading,
  listings,
  onClear,
}: {
  heading: React.ReactNode
  listings: Listing[]
  onClear: () => void
}) {
  return (
    <section className='mb-8'>
      <div className='mb-3 flex items-center justify-between gap-3'>
        <h2 className='text-base font-semibold'>{heading}</h2>
        <button
          type='button'
          className='text-xs text-muted-foreground hover:text-foreground'
          onClick={onClear}
        >
          <Trans>Clear</Trans>
        </button>
      </div>
      <div className='flex gap-3 overflow-x-auto pb-2 sm:gap-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
        {listings.map((listing) => (
          <div
            key={listing.id}
            className='w-[44vw] shrink-0 sm:w-56 lg:w-60'
          >
            <ListingCardFromSearch listing={listing} />
          </div>
        ))}
      </div>
    </section>
  )
}

function FilterSelect({
  icon,
  label,
  value,
  options,
  onToggle,
  onClear,
}: {
  icon: React.ReactNode
  label: string
  value: string | undefined
  options: { value: string; label: string }[]
  onToggle: (value: string) => void
  onClear: () => void
}) {
  const isActive = !!value
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
            const checked = value === opt.value
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

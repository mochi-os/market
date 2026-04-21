import { useEffect, useMemo, useState } from 'react'
import { Link, useLoaderData, useNavigate, useSearch } from '@tanstack/react-router'
import { ExternalLink, List, Plus, Search } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  GeneralError,
  Input,
  ListSkeleton,
  LoadMore,
  Main,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  getErrorMessage,
  isInShell,
  toast,
  useDebounce,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Listing } from '@/types'
import { listingsApi } from '@/api/listings'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'sold', label: 'Sold' },
  { value: 'expired', label: 'Expired' },
  { value: 'removed', label: 'Removed' },
]

export function MyListingsPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('Listings')
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings/mine',
  })
  const navigate = useNavigate()
  const [appealListing, setAppealListing] = useState<Listing | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creating, setCreating] = useState(false)

  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { isOnboarded, refresh: refreshAccount } = useAccountStore()
  const [connectingStripe, setConnectingStripe] = useState(false)
  const [checkingStatus, setCheckingStatus] = useState(false)

  const oauthReturn = useSearch({ strict: false }) as {
    stripe_connected?: string
    stripe_error?: string
  }

  useEffect(() => {
    if (oauthReturn.stripe_connected) {
      toast.success('Stripe connected')
      refreshAccount()
      window.history.replaceState(null, '', window.location.pathname)
    } else if (oauthReturn.stripe_error) {
      toast.error(oauthReturn.stripe_error)
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [oauthReturn.stripe_connected, oauthReturn.stripe_error, refreshAccount])

  async function handleConnectStripe() {
    setConnectingStripe(true)
    try {
      const { url } = await accountsApi.stripeOnboarding(window.location.href)
      if (isInShell()) {
        window.parent.postMessage({ type: 'navigate-top', url }, '*')
      } else {
        window.location.href = url
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to start Stripe connect'))
      setConnectingStripe(false)
    }
  }

  async function handleCheckStatus() {
    setCheckingStatus(true)
    try {
      const status = await accountsApi.stripeStatus()
      if (status.charges_enabled && status.payouts_enabled) {
        await refreshAccount()
        toast.success('Stripe setup complete')
      } else {
        toast.error('Stripe account not fully set up yet')
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to check status'))
    } finally {
      setCheckingStatus(false)
    }
  }

  const params = useMemo(
    () => ({
      status: status === 'all' ? undefined : status,
      query: debouncedSearch || undefined,
    }),
    [status, debouncedSearch],
  )

  const initial = useMemo(
    () =>
      data ? { items: data.listings as Listing[], total: data.total } : undefined,
    [data],
  )

  const {
    items: listings,
    total,
    hasMore,
    isLoading,
    loadMore,
  } = useLoadMore<Listing, { status?: string; query?: string }>({
    fetcher: (p) => listingsApi.mine(p).then((r) => ({ items: r.listings, total: r.total })),
    initial,
    params,
  })

  async function handleCreate() {
    setCreating(true)
    try {
      const listing = await listingsApi.create({ title: '' })
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create listing'))
      setCreating(false)
    }
  }

  async function handleAppeal() {
    if (!appealListing || !appealReason.trim()) return
    setSubmitting(true)
    try {
      await listingsApi.appeal(appealListing.id, appealReason)
      toast.success('Appeal submitted')
      setAppealListing(null)
      setAppealReason('')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to submit appeal'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<List className='size-4 md:size-5' />}
        title='Listings'
        actions={
          <Button size='sm' onClick={handleCreate} disabled={creating}>
            <Plus className='size-4' />
            {creating ? 'Creating...' : 'Create listing'}
          </Button>
        }
      />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}
        <div className='mb-4 flex flex-col gap-2 sm:flex-row'>
          <div className='relative flex-1'>
            <Search className='pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground' />
            <Input
              className='pl-9'
              placeholder='Search title or description'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className='sm:w-40'>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {!data && isLoading ? (
          <ListSkeleton count={5} />
        ) : listings.length === 0 ? (
          <div className='space-y-4'>
            <EmptyState icon={List} title='No listings' />
            {!isOnboarded && (
              <div className='mx-auto max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
                <p className='mb-3'>
                  Connect Stripe to publish listings and receive payments.
                </p>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                  >
                    <ExternalLink className='size-4' />
                    {connectingStripe ? 'Loading...' : 'Connect Stripe'}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                  >
                    {checkingStatus ? 'Checking...' : 'Check status'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className='space-y-2'>
              {listings.map((listing: Listing) => (
                <Link
                  key={listing.id}
                  to={
                    listing.status === 'draft'
                      ? APP_ROUTES.LISTINGS.EDIT(listing.id)
                      : APP_ROUTES.LISTINGS.VIEW(listing.id)
                  }
                >
                  <div className='flex items-center justify-between rounded-lg border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
                    <div className='min-w-0'>
                      <p className='truncate font-medium'>{listing.title}</p>
                      <p className='text-xs text-muted-foreground'>
                        {formatTimestamp(listing.created)}
                      </p>
                    </div>
                    <div className='flex items-center gap-3'>
                      {listing.price > 0 && (
                        <span className='text-sm font-medium'>
                          {formatPrice(listing.price, listing.currency)}
                        </span>
                      )}
                      <StatusBadge
                        status={
                          listing.moderation === 'hold'
                            ? 'hold'
                            : listing.status
                        }
                      />
                      {listing.moderation === 'rejected' && (
                        <Button
                          size='sm'
                          variant='outline'
                          onClick={(e) => {
                            e.preventDefault()
                            setAppealListing(listing)
                          }}
                        >
                          Appeal
                        </Button>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <LoadMore
              hasMore={hasMore}
              isLoading={isLoading}
              onLoadMore={loadMore}
              totalShown={listings.length}
              total={total}
            />
          </>
        )}
      </Main>

      <Dialog
        open={appealListing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAppealListing(null)
            setAppealReason('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appeal rejection</DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <p className='text-sm'>{appealListing?.title}</p>
            {appealListing?.notes && (
              <p className='text-sm text-muted-foreground'>
                Rejection reason: {appealListing.notes}
              </p>
            )}
            <Textarea
              placeholder='Why should this listing be reconsidered?'
              value={appealReason}
              onChange={(e) => setAppealReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setAppealListing(null)
                setAppealReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAppeal}
              disabled={submitting || !appealReason.trim()}
            >
              {submitting ? 'Submitting...' : 'Submit appeal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

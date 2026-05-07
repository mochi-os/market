import { useEffect, useMemo, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import { Edit, ExternalLink, List, MoreHorizontal, Plus, RotateCw, Search, Trash2 } from 'lucide-react'
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
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
  toast,
  useDebounce,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Fees, Listing } from '@/types'
import { listingsApi } from '@/api/listings'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'
import { FeeDisclosure } from '@/components/shared/fee-disclosure'
import { useStripeConnect } from './use-stripe-connect'

export function MyListingsPage() {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle(t`Listings`)

  const STATUS_OPTIONS = [
    { value: 'all', label: t`All` },
    { value: 'draft', label: t`Draft` },
    { value: 'active', label: t`Active` },
    { value: 'sold', label: t`Sold` },
    { value: 'expired', label: t`Expired` },
    { value: 'removed', label: t`Removed` },
  ]
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const [appealListing, setAppealListing] = useState<Listing | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Listing | null>(null)
  const [relistTarget, setRelistTarget] = useState<Listing | null>(null)
  const [rowBusy, setRowBusy] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creating, setCreating] = useState(false)

  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { account, isOnboarded, refresh: refreshAccount } = useAccountStore()
  const stripeLinked = !!account?.stripe
  const { connecting: connectingStripe, connect: handleConnectStripe } = useStripeConnect()
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [fees, setFees] = useState<Fees | null>(null)

  useEffect(() => {
    if (isOnboarded) return
    accountsApi.fees().then(setFees).catch(() => {})
  }, [isOnboarded])

  async function handleCheckStatus() {
    setCheckingStatus(true)
    try {
      const status = await accountsApi.stripeStatus()
      if (status.charges_enabled && status.payouts_enabled) {
        await refreshAccount()
        toast.success(t`Stripe setup complete`)
      } else {
        toast.error(t`Stripe account not fully set up yet`)
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to check status`))
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
      const listing = await listingsApi.create({ title: '', quantity: 1 })
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to create listing`))
      setCreating(false)
    }
  }

  async function handleRowRelist() {
    if (!relistTarget) return
    setRowBusy(true)
    try {
      const result = await listingsApi.relist(relistTarget.id)
      if (result.auction) {
        const durationSeconds = result.auction.closes - result.auction.opens
        const durationDays = Math.max(1, Math.round(durationSeconds / 86400))
        sessionStorage.setItem(
          `relist:${result.listing.id}`,
          JSON.stringify({
            reserve: result.auction.reserve,
            instant: result.auction.instant,
            duration: String(durationDays),
          }),
        )
      }
      toast.success(t`Listing copied as draft`)
      setRelistTarget(null)
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(result.listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to relist`))
    } finally {
      setRowBusy(false)
    }
  }

  async function handleRowRemove() {
    if (!removeTarget) return
    setRowBusy(true)
    try {
      await listingsApi.delete(removeTarget.id)
      toast.success(removeTarget.status === 'draft' ? t`Draft deleted` : t`Listing removed`)
      setRemoveTarget(null)
      await router.invalidate({
        filter: (m) => m.routeId === '/_authenticated/listings',
      })
    } catch (err) {
      toast.error(getErrorMessage(
        err,
        removeTarget.status === 'draft' ? t`Failed to delete draft` : t`Failed to remove listing`,
      ))
    } finally {
      setRowBusy(false)
    }
  }

  async function handleAppeal() {
    if (!appealListing || !appealReason.trim()) return
    setSubmitting(true)
    try {
      await listingsApi.appeal(appealListing.id, appealReason)
      toast.success(t`Appeal submitted`)
      setAppealListing(null)
      setAppealReason('')
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to submit appeal`))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        icon={<List className='size-4 md:size-5' />}
        title={t`Listings`}
        actions={
          isOnboarded ? (
            <Button size='sm' onClick={handleCreate} disabled={creating}>
              <Plus className='size-4' />
              {creating ? t`Creating...` : t`Create listing`}
            </Button>
          ) : undefined
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
              className='ps-9'
              placeholder={t`Search title or description`}
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
            <EmptyState icon={List} title={t`No listings`} />
            {!isOnboarded && (
              <div className='mx-auto max-w-md space-y-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm'>
                <FeeDisclosure
                  fees={fees}
                  subtitle={stripeLinked
                    ? t`Stripe needs more information before you can accept payments. Continue setup on Stripe to publish listings.`
                    : t`Connect Stripe to publish listings and receive payments`}
                />
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    onClick={handleConnectStripe}
                    disabled={connectingStripe}
                  >
                    <ExternalLink className='size-4' />
                    {connectingStripe
                      ? t`Loading...`
                      : stripeLinked
                        ? t`Continue Stripe setup`
                        : t`Connect Stripe`}
                  </Button>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={handleCheckStatus}
                    disabled={checkingStatus}
                  >
                    {checkingStatus ? t`Checking...` : t`Check status`}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className='space-y-2'>
              {listings.map((listing: Listing) => {
                const isDraft = listing.status === 'draft'
                const isRemoved = listing.status === 'removed'
                const canRelist = !isDraft && !isRemoved
                const canRemove = !isRemoved
                const showMenu = canRelist || canRemove
                return (
                  <Link
                    key={listing.id}
                    to={
                      isDraft
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
                            <Trans>Appeal</Trans>
                          </Button>
                        )}
                        {showMenu && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant='ghost'
                                size='icon'
                                aria-label={t`More actions`}
                                onClick={(e) => e.preventDefault()}
                              >
                                <MoreHorizontal className='size-4' />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align='end' onClick={(e) => e.preventDefault()}>
                              {isDraft && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
                                  }}
                                >
                                  <Edit className='size-4' />
                                  <Trans>Edit</Trans>
                                </DropdownMenuItem>
                              )}
                              {canRelist && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setRelistTarget(listing)
                                  }}
                                >
                                  <RotateCw className='size-4' />
                                  <Trans>Relist</Trans>
                                </DropdownMenuItem>
                              )}
                              {canRemove && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setRemoveTarget(listing)
                                  }}
                                >
                                  <Trash2 className='size-4' />
                                  {isDraft ? <Trans>Delete draft</Trans> : <Trans>Remove listing</Trans>}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </div>
                  </Link>
                )
              })}
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
            <DialogTitle><Trans>Appeal rejection</Trans></DialogTitle>
          </DialogHeader>
          <div className='space-y-4 py-4'>
            <p className='text-sm'>{appealListing?.title}</p>
            {appealListing?.notes && (
              <p className='text-sm text-muted-foreground'>
                <Trans>Rejection reason: {appealListing.notes}</Trans>
              </p>
            )}
            <Textarea
              placeholder={t`Why should this listing be reconsidered?`}
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
              <Trans>Cancel</Trans>
            </Button>
            <Button
              onClick={handleAppeal}
              disabled={submitting || !appealReason.trim()}
            >
              {submitting ? t`Submitting...` : t`Submit appeal`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open) setRemoveTarget(null) }}
        title={removeTarget?.status === 'draft' ? t`Delete this draft?` : t`Remove this listing?`}
        desc={removeTarget?.status === 'draft'
          ? t`The draft will be permanently deleted.`
          : t`The listing will be hidden from buyers. This cannot be undone, but you can relist it later as a new draft.`}
        handleConfirm={handleRowRemove}
        confirmText={removeTarget?.status === 'draft' ? t`Delete` : t`Remove`}
        destructive
        isLoading={rowBusy}
      />

      <ConfirmDialog
        open={relistTarget !== null}
        onOpenChange={(open) => { if (!open) setRelistTarget(null) }}
        title={t`Relist this item?`}
        desc={t`A new draft will be created with the same details so you can edit and republish. The original listing is left as is.`}
        handleConfirm={handleRowRelist}
        confirmText={t`Create draft`}
        isLoading={rowBusy}
      />
    </>
  )
}

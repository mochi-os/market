// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useMemo, useState } from 'react'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData, useNavigate, useRouter } from '@tanstack/react-router'
import { Edit, Flag, List, Loader2, MoreHorizontal, Plus, RotateCw, Search, Send, Store, Trash2 } from 'lucide-react'
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
  Label,
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
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  getErrorMessage,
  toastAction,
  useDebounce,
  useLoadMore,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Listing } from '@/types'
import type { RemovalCheck } from '@/api/listings'
import { listingsApi } from '@/api/listings'
import { useAccountStore } from '@/stores/account-store'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

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
    { value: 'rejected', label: t`Rejected` },
    { value: 'removed', label: t`Removed` },
  ]
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings',
  })
  const navigate = useNavigate()
  const router = useRouter()
  const [appealListing, setAppealListing] = useState<Listing | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Listing | null>(null)
  const [removalCheck, setRemovalCheck] = useState<RemovalCheck | null>(null)
  const [relistTarget, setRelistTarget] = useState<Listing | null>(null)
  const [rowBusy, setRowBusy] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState('')

  const [status, setStatus] = useState('all')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const { isSeller, isOnboarded } = useAccountStore()

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

  // Create only once the seller has given the listing a title, so backing out
  // of the editor can't leave an empty draft behind (mochi-dev-469).
  async function handleCreate() {
    const title = createTitle.trim()
    if (!title) return
    setCreating(true)
    try {
      const listing = await toastAction(
        listingsApi.create({ title, quantity: 1 }),
        {
          loading: t`Creating listing...`,
          success: false,
          error: (e) => getErrorMessage(e, t`Failed to create listing`),
        },
      )
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
    } catch {
      // toastAction already showed error
    } finally {
      setCreating(false)
    }
  }

  async function handleRowRelist() {
    if (!relistTarget) return
    setRowBusy(true)
    try {
      const result = await toastAction(listingsApi.relist(relistTarget.id), {
        loading: t`Relisting...`,
        success: t`Listing copied as draft`,
        error: (e) => getErrorMessage(e, t`Failed to relist`),
      })
      if (result.auction) {
        const durationSeconds = result.auction.closes - result.auction.opens
        const durationDays = Math.max(1, Math.round(durationSeconds / 86400))
        // Best-effort: sessionStorage can throw on an opaque origin in strict
        // browsers; losing the prefill must not break the relist itself.
        try {
          sessionStorage.setItem(
            `relist:${result.listing.id}`,
            JSON.stringify({
              reserve: result.auction.reserve,
              instant: result.auction.instant,
              duration: String(durationDays),
            }),
          )
        } catch {
          // prefill lost, relist still succeeds
        }
      }
      setRelistTarget(null)
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(result.listing.id) })
    } catch {
      // toastAction already showed error
    } finally {
      setRowBusy(false)
    }
  }

  async function handleRowRemove() {
    if (!removeTarget) return
    const isDraft = removeTarget.status === 'draft'
    const isCleared = removeTarget.status === 'removed'
    setRowBusy(true)
    try {
      await toastAction(listingsApi.delete(removeTarget.id), {
        loading: isCleared ? t`Clearing...` : t`Deleting...`,
        success: isDraft
          ? t`Draft deleted`
          : isCleared
            ? t`Listing cleared`
            : t`Listing removed`,
        error: (e) =>
          getErrorMessage(
            e,
            isDraft
              ? t`Failed to delete draft`
              : isCleared
                ? t`Failed to clear listing`
                : t`Failed to remove listing`
          ),
      })
      setRemoveTarget(null)
      setRemovalCheck(null)
      await router.invalidate({
        filter: (m) => m.routeId === '/_authenticated/listings',
      })
    } catch {
      // toastAction already showed error
    } finally {
      setRowBusy(false)
    }
  }

  async function handleAppeal() {
    if (!appealListing || !appealReason.trim()) return
    setSubmitting(true)
    try {
      await toastAction(listingsApi.appeal(appealListing.id, appealReason), {
        loading: t`Submitting appeal...`,
        success: t`Appeal submitted`,
        error: (e) => getErrorMessage(e, t`Failed to submit appeal`),
      })
      setAppealListing(null)
      setAppealReason('')
    } catch {
      // toastAction already showed error
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
            <Button
              size='sm'
              onClick={() => {
                setCreateTitle('')
                setCreateOpen(true)
              }}
            >
              <Plus className='size-4' />
              <Trans>Create listing</Trans>
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
          <div className='space-y-6'>
            <EmptyState icon={List} title={t`No listings`} />
            {isSeller && !isOnboarded && (
              <div className='flex justify-center'>
                <Button asChild>
                  <Link to={APP_ROUTES.SELLER_SETTINGS}>
                    <Store className='size-4' />
                    <Trans>Complete seller setup</Trans>
                  </Link>
                </Button>
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
                // Already off the market - the only thing left to do with it is
                // take it out of this list, which is what a rejected listing
                // used to offer no way to do at all (#499).
                const canClear = isRemoved
                const showMenu = canRelist || canRemove || canClear
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
                              : listing.moderation === 'rejected'
                                ? 'rejected'
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
                            <Flag className='size-4' />
                            <Trans>Appeal</Trans>
                          </Button>
                        )}
                        {showMenu && (
                          <DropdownMenu>
                            <Tooltip>
                              <TooltipTrigger asChild>
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
                              </TooltipTrigger>
                              <TooltipContent>{t`More actions`}</TooltipContent>
                            </Tooltip>
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
                                    setRemovalCheck(null)
                                    if (listing.status !== 'draft') {
                                      void listingsApi.removalCheck(listing.id)
                                        .then(setRemovalCheck)
                                        .catch(() => setRemovalCheck(null))
                                    }
                                  }}
                                >
                                  <Trash2 className='size-4' />
                                  {isDraft ? <Trans>Delete draft</Trans> : <Trans>Remove listing</Trans>}
                                </DropdownMenuItem>
                              )}
                              {canClear && (
                                <DropdownMenuItem
                                  onSelect={(e) => {
                                    e.preventDefault()
                                    setRemoveTarget(listing)
                                    setRemovalCheck(null)
                                  }}
                                >
                                  <Trash2 className='size-4' />
                                  <Trans>Clear from my listings</Trans>
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleCreate()
            }}
          >
            <DialogHeader>
              <DialogTitle><Trans>Create listing</Trans></DialogTitle>
            </DialogHeader>
            <div className='space-y-2 py-4'>
              <Label htmlFor='create-title'><Trans>Title</Trans></Label>
              <Input
                id='create-title'
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={() => setCreateOpen(false)}
              >
                <Trans>Cancel</Trans>
              </Button>
              <Button type='submit' disabled={creating || !createTitle.trim()}>
                {creating ? <Loader2 className='size-4 animate-spin' /> : <Plus className='size-4' />}
                {creating ? t`Creating...` : t`Create`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
              {submitting ? <Loader2 className='size-4 animate-spin' /> : <Send className='size-4' />}
              {submitting ? t`Submitting...` : t`Submit appeal`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => { if (!open) { setRemoveTarget(null); setRemovalCheck(null) } }}
        title={removeTarget?.status === 'draft'
          ? t`Delete this draft?`
          : removeTarget?.status === 'removed'
            ? t`Clear this listing?`
            : t`Remove this listing?`}
        desc={removeTarget?.status === 'draft'
          ? t`The draft will be permanently deleted.`
          : removeTarget?.status === 'removed'
            ? t`It will no longer appear in your listings. Buyers already cannot see it, and its moderation history is kept.`
          : removalCheck?.has_active_auction && removalCheck.active_bidders > 0
            ? t`This will cancel the auction and notify ${removalCheck.active_bidders} active ${plural(removalCheck.active_bidders, { one: 'bidder', other: 'bidders' })}. The listing will be hidden from buyers; you can relist it later as a new draft.`
            : removalCheck?.has_active_auction
              ? t`This will cancel the auction. The listing will be hidden from buyers; you can relist it later as a new draft.`
              : removalCheck && removalCheck.active_subscribers > 0
                ? t`This will cancel ${removalCheck.active_subscribers} active ${plural(removalCheck.active_subscribers, { one: 'subscription', other: 'subscriptions' })} at the end of the current billing period. Subscribers will be notified. The listing will be hidden from buyers.`
                : t`The listing will be hidden from buyers. This cannot be undone, but you can relist it later as a new draft.`}
        handleConfirm={handleRowRemove}
        confirmText={removeTarget?.status === 'draft'
          ? t`Delete`
          : removeTarget?.status === 'removed'
            ? t`Clear`
            : t`Remove`}
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

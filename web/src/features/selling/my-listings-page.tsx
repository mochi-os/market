import { useState } from 'react'
import { Link, useLoaderData, useNavigate } from '@tanstack/react-router'
import { List, Plus } from 'lucide-react'
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  EmptyState,
  GeneralError,
  ListSkeleton,
  Main,
  PageHeader,
  Textarea,
  getErrorMessage,
  toast,
  usePageTitle,
  useFormat,
} from '@mochi/web'
import type { Listing } from '@/types'
import { listingsApi } from '@/api/listings'
import { useFormatPrice } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'
import { StatusBadge } from '@/components/shared/status-badge'

export function MyListingsPage() {
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  usePageTitle('My listings')
  const { data, error } = useLoaderData({
    from: '/_authenticated/listings/mine',
  })
  const navigate = useNavigate()
  const [appealListing, setAppealListing] = useState<Listing | null>(null)
  const [appealReason, setAppealReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [creating, setCreating] = useState(false)

  async function handleCreate() {
    setCreating(true)
    try {
      const listing = await listingsApi.create({ title: 'Untitled listing' })
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
        title='My listings'
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
        {!data ? (
          <ListSkeleton count={5} />
        ) : data.listings.length === 0 ? (
          <EmptyState icon={List} title='No listings' />
        ) : (
          <div className='space-y-2'>
            {data.listings.map((listing: Listing) => (
              <Link
                key={listing.id}
                to={
                  listing.status === 'draft'
                    ? APP_ROUTES.LISTINGS.EDIT(listing.id)
                    : APP_ROUTES.LISTINGS.VIEW(listing.id)
                }
              >
                <div className='flex items-center justify-between rounded-[10px] border p-4 transition-all hover:border-primary/30 hover:shadow-md'>
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
                    <StatusBadge status={listing.status} />
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

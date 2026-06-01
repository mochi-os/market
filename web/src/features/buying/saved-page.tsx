import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Bookmark } from 'lucide-react'
import { Button, EmptyState, Main, PageHeader, usePageTitle } from '@mochi/web'
import type { Listing } from '@/types'
import { ListingCardFromSearch } from '@/components/shared/listing-card'
import {
  clearSaved,
  getSaved,
  loadSaved,
  onSavedChange,
} from '@/lib/saved'

export function SavedPage() {
  const { t } = useLingui()
  usePageTitle(t`Saved`)
  const [saved, setSaved] = useState<Listing[]>(getSaved())

  useEffect(() => {
    const unsubscribe = onSavedChange(() => setSaved(getSaved()))
    void loadSaved()
    return unsubscribe
  }, [])

  return (
    <>
      <PageHeader
        icon={<Bookmark className='size-4 md:size-5' />}
        title={t`Saved`}
        actions={
          saved.length > 0 ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                clearSaved()
                setSaved([])
              }}
            >
              <Trans>Clear all</Trans>
            </Button>
          ) : undefined
        }
      />
      <Main>
        {saved.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title={t`Nothing saved yet`}
            description={t`Tap the bookmark on any listing to save it here.`}
          />
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
            {saved.map((listing) => (
              <ListingCardFromSearch key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </Main>
    </>
  )
}

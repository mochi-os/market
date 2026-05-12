import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Heart } from 'lucide-react'
import { Button, EmptyState, Main, PageHeader, usePageTitle } from '@mochi/web'
import type { Listing } from '@/types'
import { ListingCardFromSearch } from '@/components/shared/listing-card'
import {
  clearFavorites,
  getFavorites,
  onFavoritesChange,
} from '@/lib/favorites'

export function FavoritesPage() {
  const { t } = useLingui()
  usePageTitle(t`Saved`)
  const [favorites, setFavorites] = useState<Listing[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
    return onFavoritesChange(() => setFavorites(getFavorites()))
  }, [])

  return (
    <>
      <PageHeader
        icon={<Heart className='size-4 md:size-5' />}
        title={t`Saved`}
        actions={
          favorites.length > 0 ? (
            <Button
              variant='outline'
              size='sm'
              onClick={() => {
                clearFavorites()
                setFavorites([])
              }}
            >
              <Trans>Clear all</Trans>
            </Button>
          ) : undefined
        }
      />
      <Main>
        {favorites.length === 0 ? (
          <EmptyState
            icon={Heart}
            title={t`Nothing saved yet`}
            description={t`Tap the heart on any listing to save it here.`}
          />
        ) : (
          <div className='grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4'>
            {favorites.map((listing) => (
              <ListingCardFromSearch key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </Main>
    </>
  )
}

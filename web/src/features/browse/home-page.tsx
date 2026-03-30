import { Link, useLoaderData } from '@tanstack/react-router'
import { Search, ShoppingBag, Tag } from 'lucide-react'
import {
  Button,
  CardSkeleton,
  EmptyState,
  GeneralError,
  Main,
  PageHeader,
  usePageTitle,
} from '@mochi/web'
import type { Category, Listing } from '@/types'
import { APP_ROUTES } from '@/config/routes'
import { ListingCardFromSearch } from '@/components/shared/listing-card'

export function HomePage() {
  usePageTitle('Market')
  const { listings, categories, error } = useLoaderData({
    from: '/_authenticated/',
  })

  return (
    <>
      <PageHeader
        icon={<ShoppingBag className='size-4 md:size-5' />}
        title='Market'
        actions={
          <Link to={APP_ROUTES.SEARCH}>
            <Button variant='outline' size='sm'>
              <Search className='size-4' />
              Search
            </Button>
          </Link>
        }
      />
      <Main>
        {error && (
          <GeneralError error={error} minimal mode='inline' />
        )}

        {categories && categories.length > 0 && (
          <section className='mb-8'>
            <h2 className='mb-4 text-lg font-semibold'>Categories</h2>
            <div className='grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'>
              {categories.map((cat: Category) => (
                <Link
                  key={cat.id}
                  to={APP_ROUTES.SEARCH}
                  search={{ category: cat.id }}
                >
                  <div className='flex items-center gap-3 rounded-[10px] border p-3 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md'>
                    <Tag className='size-5 text-muted-foreground' />
                    <span className='text-sm font-medium'>{cat.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className='mb-4 text-lg font-semibold'>Recent listings</h2>
          {!listings ? (
            <CardSkeleton count={6} />
          ) : listings.listings.length === 0 ? (
            <EmptyState icon={ShoppingBag} title='No listings yet' />
          ) : (
            <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
              {listings.listings.map((listing: Listing) => (
                <ListingCardFromSearch
                  key={listing.id}
                  listing={listing}
                />
              ))}
            </div>
          )}
        </section>
      </Main>
    </>
  )
}

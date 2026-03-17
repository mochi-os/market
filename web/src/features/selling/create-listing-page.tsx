import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import {
  Button,
  Input,
  Label,
  Main,
  PageHeader,
  toast,
  getErrorMessage,
} from '@mochi/web'
import { listingsApi } from '@/api/listings'
import { APP_ROUTES } from '@/config/routes'

export function CreateListingPage() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    try {
      const listing = await listingsApi.create({ title: title.trim() })
      navigate({ to: APP_ROUTES.LISTINGS.EDIT(listing.id) })
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to create listing'))
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader icon={<Plus className='size-4 md:size-5' />} title='Create listing' />
      <Main>
        <form onSubmit={handleCreate} className='max-w-md space-y-4'>
          <div>
            <Label htmlFor='title'>Title</Label>
            <Input
              id='title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              autoFocus
            />
          </div>
          <Button type='submit' disabled={loading || !title.trim()}>
            {loading ? 'Creating...' : 'Create draft'}
          </Button>
        </form>
      </Main>
    </>
  )
}

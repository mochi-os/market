import { useState } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { BadgeCheck, MapPin, Settings, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  GeneralError,
  Main,
  PageHeader,
  PlacePicker,
  Textarea,
  toast,
  getErrorMessage,
  type PlaceData,
} from '@mochi/web'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'
import { parseLocation } from '@/lib/format'

export function AccountPage() {
  const { account, error } = useLoaderData({
    from: '/_authenticated/account',
  })
  const { refresh } = useAccountStore()

  const [biography, setBiography] = useState(account?.biography ?? '')
  const [location, setLocation] = useState(account?.location ?? '')
  const [placePicker, setPlacePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const parsed = parseLocation(location)

  if (error) {
    return (
      <>
        <PageHeader icon={<Settings className='size-4 md:size-5' />} title='Account' />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  function handlePlaceSelect(place: PlaceData) {
    setLocation(JSON.stringify(place))
    setPlacePicker(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      await accountsApi.update({ biography, location })
      await refresh()
      toast.success('Account updated')
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader icon={<Settings className='size-4 md:size-5' />} title='Account' />
      <Main>
        <div className='max-w-md space-y-4'>
          <Card className='rounded-[10px]'>
            <CardContent className='p-4 space-y-4'>
              <div>
                <label className='text-sm font-medium'>Biography</label>
                <Textarea
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className='text-sm font-medium'>Location</label>
                {parsed ? (
                  <div className='mt-1 flex items-center gap-2 rounded-md border px-3 py-2 text-sm'>
                    <MapPin className='size-4 text-muted-foreground' />
                    <span className='flex-1'>{parsed.name}</span>
                    <button
                      type='button'
                      onClick={() => setLocation('')}
                      className='text-muted-foreground hover:text-foreground'
                    >
                      <X className='size-4' />
                    </button>
                  </div>
                ) : (
                  <Button
                    variant='outline'
                    className='mt-1 w-full justify-start text-muted-foreground'
                    onClick={() => setPlacePicker(true)}
                  >
                    <MapPin className='mr-2 size-4' />
                    Set location
                  </Button>
                )}
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </CardContent>
          </Card>

          {account?.seller ? (
            <Card className='rounded-[10px]'>
              <CardContent className='p-4 space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='text-sm font-medium'>Verification</span>
                  {account.verified >= 2 ? (
                    <Badge
                      variant='outline'
                      className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    >
                      <BadgeCheck className='mr-1 size-3' />
                      Verified
                    </Badge>
                  ) : (
                    <Badge
                      variant='outline'
                      className='bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    >
                      Not verified
                    </Badge>
                  )}
                </div>
                {!(account.verified >= 2) && (
                  <p className='text-xs text-muted-foreground'>
                    Complete Stripe onboarding to get verified
                  </p>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <PlacePicker
          open={placePicker}
          onOpenChange={setPlacePicker}
          onSelect={handlePlaceSelect}
        />
      </Main>
    </>
  )
}

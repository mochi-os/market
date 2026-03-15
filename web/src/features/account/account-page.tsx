import { useState } from 'react'
import { useLoaderData } from '@tanstack/react-router'
import { Settings } from 'lucide-react'
import {
  Button,
  Card,
  CardContent,
  GeneralError,
  Input,
  Label,
  Main,
  PageHeader,
  Textarea,
  toast,
  getErrorMessage,
} from '@mochi/common'
import { accountsApi } from '@/api/accounts'
import { useAccountStore } from '@/stores/account-store'

export function AccountPage() {
  const { account, error } = useLoaderData({
    from: '/_authenticated/account',
  })
  const { refresh } = useAccountStore()

  const [name, setName] = useState(account?.name ?? '')
  const [biography, setBiography] = useState(account?.biography ?? '')
  const [location, setLocation] = useState(account?.location ?? '')
  const [saving, setSaving] = useState(false)

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

  async function handleSave() {
    setSaving(true)
    try {
      await accountsApi.update({ name, biography, location })
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
                <Label htmlFor='name'>Name</Label>
                <Input
                  id='name'
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor='biography'>Biography</Label>
                <Textarea
                  id='biography'
                  value={biography}
                  onChange={(e) => setBiography(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor='location'>Location</Label>
                <Input
                  id='location'
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}

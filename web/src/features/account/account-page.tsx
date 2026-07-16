// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { useEffect, useState } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { Link, useLoaderData } from '@tanstack/react-router'
import { BadgeCheck, Check, Loader2, MapPin, Settings, Store, X } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  GeneralError,
  Label,
  Main,
  PageHeader,
  PlacePicker,
  Switch,
  Textarea,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  toast,
  getErrorMessage,
  usePageTitle,
  type PlaceData,
  jsonValueUnchanged,
} from '@mochi/web'
import type { Account } from '@/types'
import { accountsApi } from '@/api/accounts'
import {
  AddressFields,
  AddressFieldsView,
  addressFromAccount,
  type AddressValues,
} from '@/components/shared/address-fields'
import { useAccountStore } from '@/stores/account-store'
import { parseLocation } from '@/lib/format'
import { APP_ROUTES } from '@/config/routes'

type ProfileValues = {
  biography: string
  location: string
}

type BusinessValues = {
  isBusiness: boolean
  company: string
  vat: string
}

function profileFromAccount(account: Account | null | undefined): ProfileValues {
  return {
    biography: account?.biography ?? '',
    location: account?.location ?? '',
  }
}

function businessFromAccount(account: Account | null | undefined): BusinessValues {
  return {
    isBusiness: !!account?.business,
    company: account?.company ?? '',
    vat: account?.vat ?? '',
  }
}

function ViewValue({
  value,
  multiline = false,
}: {
  value: string
  multiline?: boolean
}) {
  return (
    <div className={multiline ? 'min-h-[5.25rem]' : 'min-h-10 flex items-center'}>
      <p
        className={[
          'text-sm',
          multiline ? 'whitespace-pre-wrap' : '',
          value.trim() ? '' : 'text-muted-foreground',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value.trim() ? value : <Trans>Not added yet</Trans>}
      </p>
    </div>
  )
}

function CardEditActions({
  editing,
  saving,
  saveDisabled,
  onEdit,
  onCancel,
  onSave,
}: {
  editing: boolean
  saving: boolean
  saveDisabled?: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
}) {
  const { t } = useLingui()

  if (editing) {
    return (
      <div className='flex justify-end gap-2 border-t pt-4'>
        <Button variant='outline' onClick={onCancel} disabled={saving}>
          <Trans>Cancel</Trans>
        </Button>
        <Button onClick={onSave} disabled={saving || saveDisabled}>
          {saving ? <Loader2 className='size-4 animate-spin' /> : <Check className='size-4' />}
          {saving ? t`Saving...` : t`Save`}
        </Button>
      </div>
    )
  }

  return (
    <div className='flex justify-end'>
      <Button variant='outline' size='sm' onClick={onEdit}>
        <Trans>Edit</Trans>
      </Button>
    </div>
  )
}

function SellerStatusCard({
  account,
  isOnboarded,
}: {
  account: Account | null | undefined
  isOnboarded: boolean
}) {
  const isSeller = !!account?.seller
  const isSellerReady = isSeller && isOnboarded

  if (account?.status === 'suspended' || account?.status === 'banned') {
    return null
  }

  if (!isSeller) {
    return (
      <Card className='rounded-lg'>
        <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between'>
          <div className='flex items-start gap-3'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <Store className='size-4' />
            </div>
            <div className='space-y-1'>
              <p className='text-sm font-medium'><Trans>Start selling on Mochi</Trans></p>
              <p className='text-sm text-muted-foreground'>
                <Trans>Create a seller account to list items and reach buyers.</Trans>
              </p>
            </div>
          </div>
          <Button asChild size='sm' className='shrink-0'>
            <Link to={APP_ROUTES.SELLER_SETTINGS}>
              <Store className='size-4' />
              <Trans>Become a seller</Trans>
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={isSellerReady ? 'rounded-lg' : 'rounded-lg border-amber-200 dark:border-amber-900'}>
      <CardContent className='flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between'>
        <div className='flex items-start gap-3'>
          <div
            className={
              isSellerReady
                ? 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
            }
          >
            {isSellerReady ? <BadgeCheck className='size-4' /> : <Store className='size-4' />}
          </div>
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='text-sm font-medium'>
                {isSellerReady ? <Trans>Seller account active</Trans> : <Trans>Seller setup incomplete</Trans>}
              </p>
              {isSellerReady && (
                <Badge
                  variant='outline'
                  className='bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                >
                  <Trans>Active</Trans>
                </Badge>
              )}
            </div>
            <p className='text-sm text-muted-foreground'>
              {isSellerReady ? (
                <Trans>Stripe connected.</Trans>
              ) : (
                <Trans>Connect Stripe to start listing items and receiving payments.</Trans>
              )}
            </p>
          </div>
        </div>
        <Button asChild size='sm' variant={isSellerReady ? 'outline' : 'default'} className='shrink-0'>
          <Link to={APP_ROUTES.SELLER_SETTINGS}>
            {isSellerReady ? <Trans>View seller settings</Trans> : <Trans>Continue setup</Trans>}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function AccountPage() {
  const { t } = useLingui()
  usePageTitle(t`Account`)
  const { account: loaderAccount, error } = useLoaderData({
    from: '/_authenticated/account',
  })
  const { account: storeAccount, isOnboarded, refresh } = useAccountStore()
  const account = storeAccount ?? loaderAccount

  const [savedProfile, setSavedProfile] = useState(() =>
    profileFromAccount(loaderAccount),
  )
  const [savedBusiness, setSavedBusiness] = useState(() =>
    businessFromAccount(loaderAccount),
  )
  const [savedAddress, setSavedAddress] = useState(() =>
    addressFromAccount(loaderAccount),
  )

  const [profileEditing, setProfileEditing] = useState(false)
  const [businessEditing, setBusinessEditing] = useState(false)
  const [addressEditing, setAddressEditing] = useState(false)

  const [profileDraft, setProfileDraft] = useState(savedProfile)
  const [businessDraft, setBusinessDraft] = useState(savedBusiness)
  const [addressDraft, setAddressDraft] = useState(savedAddress)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingBusiness, setSavingBusiness] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  const [placePicker, setPlacePicker] = useState(false)

  const isSeller = !!account?.seller
  const profileParsed = parseLocation(
    profileEditing ? profileDraft.location : savedProfile.location,
  )

  useEffect(() => {
    if (!account) return

    const nextProfile = profileFromAccount(account)
    const nextBusiness = businessFromAccount(account)
    const nextAddress = addressFromAccount(account)

    setSavedProfile(nextProfile)
    setSavedBusiness(nextBusiness)
    setSavedAddress(nextAddress)

    if (!profileEditing) setProfileDraft(nextProfile)
    if (!businessEditing) setBusinessDraft(nextBusiness)
    if (!addressEditing) setAddressDraft(nextAddress)
  }, [account, profileEditing, businessEditing, addressEditing])

  if (error) {
    return (
      <>
        <PageHeader icon={<Settings className='size-4 md:size-5' />} title={t`Account`} />
        <Main>
          <GeneralError error={error} minimal mode='inline' />
        </Main>
      </>
    )
  }

  function handlePlaceSelect(place: PlaceData) {
    setProfileDraft((prev) => ({ ...prev, location: JSON.stringify(place) }))
    setPlacePicker(false)
  }

  function handleAddressChange(field: keyof AddressValues, value: string) {
    setAddressDraft((prev) => ({ ...prev, [field]: value }))
  }

  async function saveProfile() {
    if (jsonValueUnchanged(profileDraft, savedProfile)) {
      setProfileEditing(false)
      return
    }
    setSavingProfile(true)
    try {
      await accountsApi.update({
        biography: profileDraft.biography,
        location: profileDraft.location,
      })
      setSavedProfile(profileDraft)
      setProfileEditing(false)
      await refresh({ force: true })
      toast.success(t`Account updated`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update`))
    } finally {
      setSavingProfile(false)
    }
  }

  async function saveBusiness() {
    if (jsonValueUnchanged(businessDraft, savedBusiness)) {
      setBusinessEditing(false)
      return
    }
    setSavingBusiness(true)
    try {
      await accountsApi.update({
        business: businessDraft.isBusiness ? 1 : 0,
        company: businessDraft.company,
        vat: businessDraft.vat,
      })
      setSavedBusiness(businessDraft)
      setBusinessEditing(false)
      await refresh({ force: true })
      toast.success(t`Account updated`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update`))
    } finally {
      setSavingBusiness(false)
    }
  }

  async function saveAddress() {
    if (jsonValueUnchanged(addressDraft, savedAddress)) {
      setAddressEditing(false)
      return
    }
    setSavingAddress(true)
    try {
      await accountsApi.update(addressDraft)
      setSavedAddress(addressDraft)
      setAddressEditing(false)
      await refresh({ force: true })
      toast.success(t`Account updated`)
    } catch (err) {
      toast.error(getErrorMessage(err, t`Failed to update`))
    } finally {
      setSavingAddress(false)
    }
  }

  return (
    <>
      <PageHeader icon={<Settings className='size-4 md:size-5' />} title={t`Account`} />
      <Main>
        <div className='w-full max-w-6xl space-y-6'>
          {account?.status === 'suspended' && (
            <Card className='rounded-lg border-amber-200 dark:border-amber-900'>
              <CardContent className='p-4 space-y-2'>
                <p className='text-sm font-medium text-amber-700 dark:text-amber-400'>
                  <Trans>Suspended as seller</Trans>
                </p>
                {account.reason && (
                  <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
                    {account.reason}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  <Trans>
                    You cannot create or edit listings, and buyers cannot place
                    new orders, bids, or subscriptions on your listings. You
                    can still buy from other sellers.
                  </Trans>
                </p>
              </CardContent>
            </Card>
          )}
          {account?.status === 'banned' && (
            <Card className='rounded-lg border-red-200 dark:border-red-900'>
              <CardContent className='p-4 space-y-2'>
                <p className='text-sm font-medium text-red-700 dark:text-red-400'>
                  <Trans>Account banned</Trans>
                </p>
                {account.reason && (
                  <p className='text-sm whitespace-pre-wrap text-muted-foreground'>
                    {account.reason}
                  </p>
                )}
                <p className='text-xs text-muted-foreground'>
                  <Trans>You cannot buy or sell.</Trans>
                </p>
              </CardContent>
            </Card>
          )}

          <SellerStatusCard account={account} isOnboarded={isOnboarded} />

          <div className='grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.85fr)] lg:items-start'>
            <div className='space-y-6'>
              <Card className='rounded-lg'>
                <CardContent className='p-6 space-y-6'>
                  <div className='space-y-2'>
                    <Label htmlFor={profileEditing ? 'biography' : undefined}>
                      <Trans>Biography</Trans>
                    </Label>
                    {profileEditing ? (
                      <Textarea
                        id='biography'
                        value={profileDraft.biography}
                        onChange={(e) =>
                          setProfileDraft((prev) => ({
                            ...prev,
                            biography: e.target.value,
                          }))
                        }
                        rows={3}
                        placeholder={t`Tell buyers about yourself...`}
                      />
                    ) : (
                      <ViewValue value={savedProfile.biography} multiline />
                    )}
                  </div>
                  <div className='space-y-2'>
                    <Label><Trans>Location</Trans></Label>
                    {profileEditing ? (
                      profileParsed ? (
                        <div className='flex min-h-10 items-center gap-2 rounded-md border px-3 py-2 text-sm'>
                          <MapPin className='size-4 shrink-0 text-muted-foreground' />
                          <span className='flex-1'>{profileParsed.name}</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type='button'
                                aria-label={t`Clear location`}
                                onClick={() =>
                                  setProfileDraft((prev) => ({ ...prev, location: '' }))
                                }
                                className='text-muted-foreground hover:text-foreground'
                              >
                                <X className='size-4' />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>{t`Clear location`}</TooltipContent>
                          </Tooltip>
                        </div>
                      ) : (
                        <Button
                          variant='outline'
                          className='min-h-10 w-full justify-start text-muted-foreground'
                          onClick={() => setPlacePicker(true)}
                        >
                          <MapPin className='me-2 size-4' />
                          <Trans>Set location</Trans>
                        </Button>
                      )
                    ) : (
                      <div className='flex min-h-10 items-center'>
                        {profileParsed ? (
                          <p className='flex items-center gap-2 text-sm'>
                            <MapPin className='size-4 shrink-0 text-muted-foreground' />
                            {profileParsed.name}
                          </p>
                        ) : (
                          <ViewValue value='' />
                        )}
                      </div>
                    )}
                  </div>
                  <CardEditActions
                    editing={profileEditing}
                    saving={savingProfile}
                    saveDisabled={jsonValueUnchanged(profileDraft, savedProfile)}
                    onEdit={() => {
                      setProfileDraft(savedProfile)
                      setProfileEditing(true)
                    }}
                    onCancel={() => setProfileEditing(false)}
                    onSave={saveProfile}
                  />
                </CardContent>
              </Card>

              {isSeller && (
                <Card className='rounded-lg'>
                  <CardContent className='p-6 space-y-6'>
                    <div className='space-y-1.5'>
                      <p className='text-sm font-medium'><Trans>Business details</Trans></p>
                      <p className='text-sm text-muted-foreground'>
                        <Trans>
                          Used for invoices and tax compliance. Not shown on your
                          public profile.
                        </Trans>
                      </p>
                    </div>
                    <div className='flex min-h-10 items-center justify-between gap-4'>
                      <Label
                        htmlFor={businessEditing ? 'sell-as-business' : undefined}
                        className='text-sm font-normal'
                      >
                        <Trans>I sell as a business</Trans>
                      </Label>
                      <Switch
                        id='sell-as-business'
                        checked={
                          businessEditing
                            ? businessDraft.isBusiness
                            : savedBusiness.isBusiness
                        }
                        disabled={!businessEditing}
                        onCheckedChange={(checked) =>
                          setBusinessDraft((prev) => ({
                            ...prev,
                            isBusiness: checked,
                          }))
                        }
                      />
                    </div>
                    <div className='grid gap-6 sm:grid-cols-2'>
                      <div className='space-y-2'>
                        <Label htmlFor={businessEditing ? 'company' : undefined}>
                          <Trans>Company</Trans>
                        </Label>
                        {businessEditing ? (
                          <Input
                            id='company'
                            value={businessDraft.company}
                            onChange={(e) =>
                              setBusinessDraft((prev) => ({
                                ...prev,
                                company: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <ViewValue value={savedBusiness.company} />
                        )}
                      </div>
                      <div className='space-y-2'>
                        <Label htmlFor={businessEditing ? 'vat' : undefined}>
                          <Trans>VAT / tax ID</Trans>
                        </Label>
                        {businessEditing ? (
                          <Input
                            id='vat'
                            value={businessDraft.vat}
                            onChange={(e) =>
                              setBusinessDraft((prev) => ({
                                ...prev,
                                vat: e.target.value,
                              }))
                            }
                          />
                        ) : (
                          <ViewValue value={savedBusiness.vat} />
                        )}
                      </div>
                    </div>
                    <CardEditActions
                      editing={businessEditing}
                      saving={savingBusiness}
                      saveDisabled={jsonValueUnchanged(businessDraft, savedBusiness)}
                      onEdit={() => {
                        setBusinessDraft(savedBusiness)
                        setBusinessEditing(true)
                      }}
                      onCancel={() => setBusinessEditing(false)}
                      onSave={saveBusiness}
                    />
                  </CardContent>
                </Card>
              )}

            </div>

            <Card className='rounded-lg'>
              <CardContent className='p-6 space-y-6'>
                <div className='space-y-1.5'>
                  <p className='text-sm font-medium'><Trans>Default shipping address</Trans></p>
                  <p className='text-sm text-muted-foreground'>
                    <Trans>
                      Pre-fills on future checkouts once checkout integration is
                      added.
                    </Trans>
                  </p>
                </div>
                {addressEditing ? (
                  <AddressFields
                    values={addressDraft}
                    onChange={handleAddressChange}
                    idPrefix='account'
                    showTitle={false}
                  />
                ) : (
                  <AddressFieldsView values={savedAddress} />
                )}
                <CardEditActions
                  editing={addressEditing}
                  saving={savingAddress}
                  saveDisabled={jsonValueUnchanged(addressDraft, savedAddress)}
                  onEdit={() => {
                    setAddressDraft(savedAddress)
                    setAddressEditing(true)
                  }}
                  onCancel={() => setAddressEditing(false)}
                  onSave={saveAddress}
                />
              </CardContent>
            </Card>
          </div>
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

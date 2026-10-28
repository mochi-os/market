// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
//
// Where the seller's listings are published as they go live: the seller's
// accounts on other networks, each switched on or off, and for one listing as
// it is published. Removing an account offers to delete the copies already
// there, keeping them by default.
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { plural } from '@lingui/core/macro'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  Card,
  CardContent,
  ConfirmDialog,
  GeneralError,
  Label,
  Switch,
  getErrorMessage,
  naturalCompare,
  providerName,
  toast,
} from '@mochi/web'
import { Archive } from 'lucide-react'
import { publishApi, type PublishAccount } from '@/api/publish'

const publishKey = ['market', 'publish']

// Whether the seller's Publish to tab is offered: an account to publish the
// listings to, or an answer that failed and shows why. Undefined while it is
// asked; false where it is not enabled, as for someone not yet a seller.
export function usePublishOffered(enabled: boolean): boolean | undefined {
  const { data, isLoading, error } = useQuery({
    queryKey: publishKey,
    queryFn: () => publishApi.get(),
    retry: false,
    enabled,
  })
  if (!enabled) return false
  if (isLoading) return undefined
  return !!error || (data?.accounts ?? []).length > 0
}

export function PublishingSection() {
  const { t } = useLingui()
  const queryClient = useQueryClient()
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: publishKey,
    queryFn: () => publishApi.get(),
    retry: false,
  })
  const [busy, setBusy] = useState<string | null>(null)
  const [kept, setKept] = useState<{
    account: PublishAccount
    count: number
  } | null>(null)

  const accounts = [...(data?.accounts ?? [])].sort((a, b) =>
    naturalCompare(a.identifier, b.identifier)
  )
  const publish = data?.publish ?? []

  // With no account to publish to, as for every user while the networks are
  // off, there is nothing to choose, so nothing shows while it is asked.
  if (isLoading || (!error && accounts.length === 0)) return null

  const toggle = async (account: PublishAccount, on: boolean) => {
    setBusy(account.id)
    const next = on
      ? [...publish, account.id]
      : publish.filter((id) => id !== account.id)
    try {
      const answer = await publishApi.set(next)
      await queryClient.invalidateQueries({ queryKey: publishKey })
      if (!on && answer.kept[account.id]) {
        setKept({ account, count: answer.kept[account.id] })
      }
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not save the accounts`))
    } finally {
      setBusy(null)
    }
  }

  const forget = async (account: PublishAccount) => {
    try {
      const answer = await publishApi.forget(account.id)
      toast.success(t`Deleted ${answer.deleted} copies`)
      await refetch()
    } catch (err) {
      toast.error(getErrorMessage(err, t`Could not delete the copies`))
    }
  }

  return (
    <Card className='rounded-lg'>
      <CardContent className='space-y-2 p-4'>
        <Label>
          <Trans>Publish to</Trans>
        </Label>
        {error ? (
          <GeneralError error={error} minimal mode='inline' reset={refetch} />
        ) : (
          <div>
            {accounts.map((account) => (
              <div
                key={account.id}
                className='flex items-center justify-between gap-4 py-2'
              >
                <div className='min-w-0'>
                  <div className='truncate text-sm font-medium'>
                    {account.identifier}
                  </div>
                  <div className='text-muted-foreground text-xs'>
                    {providerName(account.type)}
                    {data?.copies[account.id]
                      ? ' · ' +
                        plural(data.copies[account.id], {
                          one: '# copy',
                          other: '# copies',
                        })
                      : ''}
                  </div>
                </div>
                <Switch
                  checked={publish.includes(account.id)}
                  loading={busy === account.id}
                  aria-label={t`Publish to ${account.identifier}`}
                  onCheckedChange={(on) => void toggle(account, on)}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
      {kept && (
        <ConfirmDialog
          open
          onOpenChange={(open) => {
            if (!open) setKept(null)
          }}
          title={t`Delete the copies on ${kept.account.identifier}?`}
          desc={t`Copies published there: ${kept.count}. They stay unless you delete them.`}
          confirmText={t`Delete copies`}
          cancelBtnText={t`Keep`}
          icon={<Archive className='size-4' />}
          destructive
          handleConfirm={async () => {
            const account = kept.account
            setKept(null)
            await forget(account)
          }}
        />
      )}
    </Card>
  )
}

/**
 * The accounts one listing goes to as it is published, preset from the
 * seller's list. Shown only where the seller has an account to choose.
 */
export function PublishSwitches({
  chosen,
  onChange,
}: {
  /** The accounts chosen for this listing, or null to follow the list. */
  chosen: string[] | null
  onChange: (accounts: string[]) => void
}) {
  const { data } = useQuery({
    queryKey: publishKey,
    queryFn: () => publishApi.get(),
    retry: false,
  })
  const accounts = [...(data?.accounts ?? [])].sort((a, b) =>
    naturalCompare(a.identifier, b.identifier)
  )
  if (accounts.length === 0) return null
  const selected = chosen ?? data?.publish ?? []
  return (
    <div className='space-y-2'>
      <Label>
        <Trans>Publish to</Trans>
      </Label>
      <div className='flex flex-wrap gap-3'>
        {accounts.map((account) => (
          <label key={account.id} className='flex items-center gap-2 text-sm'>
            <Switch
              checked={selected.includes(account.id)}
              aria-label={account.identifier}
              onCheckedChange={(on) =>
                onChange(
                  on
                    ? [...selected, account.id]
                    : selected.filter((id) => id !== account.id)
                )
              }
            />
            {account.identifier}
          </label>
        ))}
      </div>
    </div>
  )
}

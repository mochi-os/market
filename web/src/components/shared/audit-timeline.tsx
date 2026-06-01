import { useEffect, useState } from 'react'
import { useLingui } from '@lingui/react/macro'
import {
  Card,
  CardContent,
  useFormat,
  getErrorMessage,
} from '@mochi/web'
import { auditApi, type AuditEntry } from '@/api/audit'
import {
  useActionLabels,
  useReportActionLabels,
  useResolveReason,
} from './audit-labels'
import { formatFingerprint, useFormatPrice, safeJsonParse } from '@/lib/format'

interface AuditTimelineProps {
  kind: string
  object: string | number
  title?: string
}

export function AuditTimeline({
  kind,
  object,
  title,
}: AuditTimelineProps) {
  const { t } = useLingui()
  const { formatTimestamp } = useFormat()
  const formatPrice = useFormatPrice()
  const ACTION_LABELS = useActionLabels()
  const REPORT_ACTION_LABELS = useReportActionLabels()
  const resolveReason = useResolveReason()
  const resolvedTitle = title ?? t`History`
  const [entries, setEntries] = useState<AuditEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    auditApi
      .object({ kind, object: String(object), limit: 100 })
      .then((r) => {
        if (!cancelled) setEntries(r.audit)
      })
      .catch((err) => {
        if (!cancelled) setError(getErrorMessage(err, t`Failed to load history`))
      })
    return () => {
      cancelled = true
    }
  }, [kind, object, t])

  if (error) return null
  if (!entries || entries.length === 0) return null

  return (
    <Card className='rounded-lg'>
      <CardContent className='p-5'>
        <h3 className='mb-4 font-semibold'>{resolvedTitle}</h3>
        <ol className='space-y-0'>
          {entries.map((entry, idx) => {
            const label = ACTION_LABELS[entry.action] ?? entry.action
            const data = parseData(entry.data)
            const detail = formatDetail(
              entry.action,
              data,
              formatPrice,
              resolveReason,
              REPORT_ACTION_LABELS,
              t
            )
            const actor =
              entry.actor === 'system'
                ? t`System`
                : entry.actor_name || formatFingerprint(entry.actor)
            const isLast = idx === entries.length - 1
            return (
              <li key={entry.id} className='flex gap-3'>
                <div className='flex flex-col items-center'>
                  <div className='mt-1.5 size-2 shrink-0 rounded-full bg-primary/50 ring-2 ring-background' />
                  {!isLast && <div className='mt-1 w-px flex-1 bg-border' />}
                </div>
                <div className={`min-w-0 space-y-0.5 ${isLast ? '' : 'pb-4'}`}>
                  <p className='text-sm'>
                    <span className='font-medium'>{label}</span>
                    {detail && <span className='text-muted-foreground'>: {detail}</span>}
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    {formatTimestamp(entry.timestamp)} · {actor}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </CardContent>
    </Card>
  )
}

function parseData(data: string): Record<string, unknown> | null {
  return safeJsonParse<Record<string, unknown> | null>(data, null)
}

function formatDetail(
  action: string,
  data: Record<string, unknown> | null,
  formatPrice: (amount: number, currency: string) => string,
  resolveReason: (action: string, raw: string | undefined) => string | null,
  REPORT_ACTION_LABELS: Record<string, string>,
  t: (template: TemplateStringsArray, ...args: unknown[]) => string
): string | null {
  if (!data) return null
  const bits: string[] = []
  const resolvedReason = resolveReason(
    action,
    typeof data.reason === 'string' ? data.reason : undefined
  )
  if (resolvedReason) bits.push(resolvedReason)
  if (
    typeof data.amount === 'number' &&
    typeof data.currency === 'string' &&
    data.currency
  ) {
    bits.push(formatPrice(data.amount, data.currency))
  }
  if (
    typeof data.refund_amount === 'number' &&
    typeof data.currency === 'string' &&
    data.currency
  ) {
    let amountStr = formatPrice(data.refund_amount, data.currency)
    if (data.partial === true && typeof data.total === 'number') {
      const totalStr = formatPrice(data.total, data.currency)
      amountStr += ' ' + t`of ${totalStr}`
    }
    bits.push(amountStr)
  }
  if (typeof data.notes === 'string' && data.notes) bits.push(data.notes)
  if (typeof data.description === 'string' && data.description)
    bits.push(data.description)
  if (typeof data.carrier === 'string' && data.carrier) {
    const tracking =
      typeof data.tracking === 'string' && data.tracking
        ? `: ${data.tracking}`
        : ''
    bits.push(`${data.carrier}${tracking}`)
  }
  if (typeof data.action === 'string' && data.action) {
    const label =
      action === 'report.actioned'
        ? REPORT_ACTION_LABELS[data.action] ?? data.action
        : data.action
    bits.push(label)
  }
  if (typeof data.decision === 'string' && data.decision)
    bits.push(data.decision === 'upheld' ? t`Appeal upheld` : t`Appeal denied`)
  if (typeof data.moderation === 'string' && data.moderation) {
    const moderation = data.moderation
    bits.push(t`moderation: ${moderation}`)
  }
  return bits.length > 0 ? bits.join(' — ') : null
}


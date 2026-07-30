// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.

import { AuditTimeline as SharedAuditTimeline } from '@mochi/web'
import { auditApi } from '@/api/audit'
import { useActionLabels, useFormatAuditDetail } from './audit-labels'
import { formatFingerprint, useFormatPrice } from '@/lib/format'

interface AuditTimelineProps {
  kind: string
  object: string | number
  title?: string
}

// Binds market's audit vocabulary to the shared timeline.
export function AuditTimeline({ kind, object, title }: AuditTimelineProps) {
  const actionLabels = useActionLabels()
  const formatAuditDetail = useFormatAuditDetail()
  const formatPrice = useFormatPrice()

  return (
    <SharedAuditTimeline
      kind={kind}
      object={object}
      title={title}
      fetchAudit={auditApi.object}
      actionLabels={actionLabels}
      formatDetail={(data, action) =>
        formatAuditDetail(data, action, formatPrice)
      }
      formatFingerprint={formatFingerprint}
    />
  )
}

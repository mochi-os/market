// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
import { useAuthStore } from '@mochi/web'

// accountKey(base) -> string: A browser storage key of the signed-in
// account's own, so the next account to sign in on the same browser does not
// see what the last one viewed or reported. A reader not signed in keeps the
// key itself.
export function accountKey(base: string): string {
  const { identity, isAuthenticated } = useAuthStore.getState()
  return isAuthenticated && identity ? `${base}:${identity}` : base
}

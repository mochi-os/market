import type { ReactNode } from 'react'
import { Trans } from '@lingui/react/macro'
import { Input, Label } from '@mochi/web'

export type AddressValues = {
  address_name: string
  address_line1: string
  address_line2: string
  address_city: string
  address_region: string
  address_postcode: string
  address_country: string
}

export const EMPTY_ADDRESS: AddressValues = {
  address_name: '',
  address_line1: '',
  address_line2: '',
  address_city: '',
  address_region: '',
  address_postcode: '',
  address_country: '',
}

export function addressFromAccount(account: {
  address_name?: string
  address_line1?: string
  address_line2?: string
  address_city?: string
  address_region?: string
  address_postcode?: string
  address_country?: string
} | null | undefined): AddressValues {
  return {
    address_name: account?.address_name ?? '',
    address_line1: account?.address_line1 ?? '',
    address_line2: account?.address_line2 ?? '',
    address_city: account?.address_city ?? '',
    address_region: account?.address_region ?? '',
    address_postcode: account?.address_postcode ?? '',
    address_country: account?.address_country ?? '',
  }
}

type AddressFieldsProps = {
  values: AddressValues
  onChange: (field: keyof AddressValues, value: string) => void
  idPrefix?: string
  showTitle?: boolean
}

function FieldGroup({
  id,
  label,
  children,
}: {
  id: string
  label: ReactNode
  children: ReactNode
}) {
  return (
    <div className='space-y-2'>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

function ViewField({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className='space-y-2'>
      <p className='text-sm font-medium leading-none'>{label}</p>
      {value.trim() ? (
        <p className='text-sm'>{value}</p>
      ) : (
        <p className='text-sm text-muted-foreground'>
          <Trans>Not added yet</Trans>
        </p>
      )}
    </div>
  )
}

export function AddressFieldsView({ values }: { values: AddressValues }) {
  return (
    <div className='space-y-5'>
      <ViewField label={<Trans>Full name</Trans>} value={values.address_name} />
      <ViewField label={<Trans>Country</Trans>} value={values.address_country} />
      <ViewField label={<Trans>Address line 1</Trans>} value={values.address_line1} />
      <ViewField label={<Trans>Address line 2</Trans>} value={values.address_line2} />
      <div className='grid gap-5 sm:grid-cols-2'>
        <ViewField label={<Trans>City</Trans>} value={values.address_city} />
        <ViewField label={<Trans>Region</Trans>} value={values.address_region} />
      </div>
      <ViewField label={<Trans>Postcode</Trans>} value={values.address_postcode} />
    </div>
  )
}

export function AddressFields({
  values,
  onChange,
  idPrefix = 'addr',
  showTitle = true,
}: AddressFieldsProps) {
  return (
    <div className='space-y-5'>
      {showTitle && (
        <h3 className='text-sm font-medium'>
          <Trans>Shipping address</Trans>
        </h3>
      )}
      <FieldGroup id={`${idPrefix}-name`} label={<Trans>Full name</Trans>}>
        <Input
          id={`${idPrefix}-name`}
          value={values.address_name}
          onChange={(e) => onChange('address_name', e.target.value)}
        />
      </FieldGroup>
      <FieldGroup id={`${idPrefix}-country`} label={<Trans>Country</Trans>}>
        <Input
          id={`${idPrefix}-country`}
          value={values.address_country}
          onChange={(e) => onChange('address_country', e.target.value)}
        />
      </FieldGroup>
      <FieldGroup id={`${idPrefix}-line1`} label={<Trans>Address line 1</Trans>}>
        <Input
          id={`${idPrefix}-line1`}
          value={values.address_line1}
          onChange={(e) => onChange('address_line1', e.target.value)}
        />
      </FieldGroup>
      <FieldGroup id={`${idPrefix}-line2`} label={<Trans>Address line 2</Trans>}>
        <Input
          id={`${idPrefix}-line2`}
          value={values.address_line2}
          onChange={(e) => onChange('address_line2', e.target.value)}
        />
      </FieldGroup>
      <div className='grid gap-5 sm:grid-cols-2'>
        <FieldGroup id={`${idPrefix}-city`} label={<Trans>City</Trans>}>
          <Input
            id={`${idPrefix}-city`}
            value={values.address_city}
            onChange={(e) => onChange('address_city', e.target.value)}
          />
        </FieldGroup>
        <FieldGroup id={`${idPrefix}-region`} label={<Trans>Region</Trans>}>
          <Input
            id={`${idPrefix}-region`}
            value={values.address_region}
            onChange={(e) => onChange('address_region', e.target.value)}
          />
        </FieldGroup>
      </div>
      <FieldGroup id={`${idPrefix}-postcode`} label={<Trans>Postcode</Trans>}>
        <Input
          id={`${idPrefix}-postcode`}
          className='sm:max-w-48'
          value={values.address_postcode}
          onChange={(e) => onChange('address_postcode', e.target.value)}
        />
      </FieldGroup>
    </div>
  )
}

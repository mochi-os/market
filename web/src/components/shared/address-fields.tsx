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

export function AddressFields({
  values,
  onChange,
  idPrefix = 'addr',
  showTitle = true,
}: AddressFieldsProps) {
  return (
    <div className='space-y-3'>
      {showTitle && (
        <h3 className='text-sm font-medium'>
          <Trans>Shipping address</Trans>
        </h3>
      )}
      <div>
        <Label htmlFor={`${idPrefix}-country`}>
          <Trans>Country</Trans>
        </Label>
        <Input
          id={`${idPrefix}-country`}
          value={values.address_country}
          onChange={(e) => onChange('address_country', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-name`}>
          <Trans>Name</Trans>
        </Label>
        <Input
          id={`${idPrefix}-name`}
          value={values.address_name}
          onChange={(e) => onChange('address_name', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-line1`}>
          <Trans>Address line 1</Trans>
        </Label>
        <Input
          id={`${idPrefix}-line1`}
          value={values.address_line1}
          onChange={(e) => onChange('address_line1', e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-line2`}>
          <Trans>Address line 2</Trans>
        </Label>
        <Input
          id={`${idPrefix}-line2`}
          value={values.address_line2}
          onChange={(e) => onChange('address_line2', e.target.value)}
        />
      </div>
      <div className='grid gap-3 sm:grid-cols-2'>
        <div>
          <Label htmlFor={`${idPrefix}-city`}>
            <Trans>City</Trans>
          </Label>
          <Input
            id={`${idPrefix}-city`}
            value={values.address_city}
            onChange={(e) => onChange('address_city', e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor={`${idPrefix}-region`}>
            <Trans>Region</Trans>
          </Label>
          <Input
            id={`${idPrefix}-region`}
            value={values.address_region}
            onChange={(e) => onChange('address_region', e.target.value)}
          />
        </div>
      </div>
      <div>
        <Label htmlFor={`${idPrefix}-postcode`}>
          <Trans>Postcode</Trans>
        </Label>
        <Input
          id={`${idPrefix}-postcode`}
          value={values.address_postcode}
          onChange={(e) => onChange('address_postcode', e.target.value)}
        />
      </div>
    </div>
  )
}

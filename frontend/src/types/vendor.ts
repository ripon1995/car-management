export interface Vendor {
  id: string
  name: string
  address: string
  contact_number: string
  whatsapp_number: string | null
  monthly_fare: number
  created_at: string
  updated_at: string
}

export interface VendorInput {
  name: string
  address: string
  contact_number: string
  whatsapp_number?: string | null
  monthly_fare: number
}

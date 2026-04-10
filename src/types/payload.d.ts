import type { PayloadRequest as _PayloadRequest } from 'payload'

declare module 'payload' {
  interface PayloadRequest {
    uploadContext?: {
      console?: string
      game?: string
      type?: string
    }
  }
}

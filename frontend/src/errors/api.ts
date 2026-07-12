export class ApiError extends Error {
  status: number
  detail: string
  errorCode?: string

  constructor(status: number, message: string, detail: string, errorCode?: string) {
    super(message)
    this.status = status
    this.detail = detail
    this.errorCode = errorCode
  }
}

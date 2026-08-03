export class FomodError extends Error {
  public readonly code: string
  public readonly details?: unknown

  constructor(code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'FomodError'
    this.code = code
    this.details = details
  }
}

export function asFomodError(error: unknown, fallbackCode = 'FOMOD_INVALID_CONFIG'): FomodError {
  if (error instanceof FomodError) return error
  const value = error as any
  return new FomodError(String(value?.code || fallbackCode), String(value?.message || value || 'FOMOD installation failed'), value?.details)
}

import { getErrorMessage } from '../utils/errorMessage'

type Reporter = (message: string) => void

let reporter: Reporter | null = null

export function setErrorReporter(fn: Reporter | null) {
  reporter = fn
}

export function reportError(err: unknown, fallback?: string) {
  reporter?.(getErrorMessage(err, fallback))
}

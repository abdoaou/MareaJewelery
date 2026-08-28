import i18n from '../i18n'

export function getErrorMessage(
  err: unknown,
  fallback = i18n.t('common.genericError'),
): string {
  if (err instanceof Error && err.message.trim()) return err.message
  if (typeof err === 'string' && err.trim()) return err
  return fallback
}

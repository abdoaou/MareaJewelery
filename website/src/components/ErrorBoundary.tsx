import { Component, type ErrorInfo, type ReactNode } from 'react'
import i18n from '../i18n'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('UI error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[40vh] flex-col items-center justify-center px-6 text-center">
            <p className="font-serif text-xl text-marea-cream">{i18n.t('common.errorLoad')}</p>
            <button
              type="button"
              className="btn-primary mt-4"
              onClick={() => this.setState({ hasError: false })}
            >
              {i18n.t('common.tryAgain')}
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}

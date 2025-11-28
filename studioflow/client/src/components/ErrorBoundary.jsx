import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './ui/button'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
          <div className="mb-8">
            <img
              src="/Oops somthing went wrong.png"
              alt="Something went wrong"
              className="w-full max-w-[400px] h-auto mx-auto"
            />
          </div>

          <h1 className="text-3xl font-bold tracking-tight mb-2">Something went wrong</h1>
          <p className="text-muted-foreground max-w-[500px] mb-8">
            An unexpected error occurred. We've been notified and are working to fix it.
          </p>

          <div className="flex gap-4">
            <Button onClick={() => window.location.reload()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Reload Page
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/'}>
              Go Home
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary

import { Component } from 'react'

export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('MedVault UI crashed', error, errorInfo)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error">
          <div className="app-error__panel">
            <h1>Something went wrong</h1>
            <p>{this.state.error?.message || 'The page could not be rendered.'}</p>
            <a className="btn btn-primary" href="/login">Back to login</a>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

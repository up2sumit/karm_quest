import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * React error boundary — prevents a white-screen crash.
 * Displays a recovery UI with a "Reload" button.
 */
export class ErrorBoundary extends Component<Props, State> {
    state: State = { hasError: false, error: null };

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('[KarmQuest] Uncaught error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh', display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', padding: '2rem',
                    background: '#0B0D18', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif',
                    textAlign: 'center',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛡️</div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#94a3b8', fontSize: '0.875rem', maxWidth: '400px', marginBottom: '1.5rem' }}>
                        KarmQuest hit an unexpected error. Your data is safe in local storage.
                    </p>
                    {this.state.error && (
                        <pre style={{
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '0.75rem', padding: '1rem', fontSize: '0.75rem', color: '#f87171',
                            maxWidth: '500px', overflow: 'auto', marginBottom: '1.5rem', textAlign: 'left',
                        }}>
                            {this.state.error.message}
                        </pre>
                    )}
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            padding: '0.75rem 2rem', borderRadius: '0.75rem', border: 'none',
                            background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                            color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer',
                        }}
                    >
                        Reload App
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

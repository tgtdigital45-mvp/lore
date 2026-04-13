import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };

type State = { hasError: boolean };

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Landing error:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          role="alert"
          style={{
            minHeight: "40vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>Algo deu errado</h1>
          <p style={{ color: "#444", textAlign: "center", maxWidth: "28rem" }}>
            Atualize a página ou volte mais tarde. Se o problema persistir, contate o suporte.
          </p>
          <button
            type="button"
            style={{ marginTop: "1rem", padding: "0.5rem 1rem", cursor: "pointer" }}
            onClick={() => window.location.reload()}
          >
            Atualizar página
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

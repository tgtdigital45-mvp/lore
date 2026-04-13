import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode; title?: string };

type State = { hasError: boolean; message: string | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: null };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" style={{ padding: "2rem", maxWidth: 560, margin: "2rem auto", fontFamily: "system-ui" }}>
          <h1 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{this.props.title ?? "Algo deu errado"}</h1>
          <p style={{ color: "#555" }}>{this.state.message ?? "Erro inesperado. Recarregue a página."}</p>
          <button type="button" style={{ marginTop: "1rem" }} onClick={() => window.location.reload()}>
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

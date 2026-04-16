import { Component, type ErrorInfo, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { captureAppError } from "@/src/lib/sentry";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Fallback explícito além do ErrorBoundary do expo-router (rotas).
 * Captura falhas em providers / layout raiz.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[AppErrorBoundary]", error.message, info.componentStack);
    captureAppError(error, info.componentStack ?? null);
  }

  private reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error) {
      return (
        <View style={styles.screen} accessibilityRole="alert">
          <Text style={styles.title}>Algo deu errado</Text>
          <Text style={styles.body}>O app encontrou um erro inesperado. Tente novamente.</Text>
          {__DEV__ ? (
            <Text style={styles.detail} selectable>
              {error.message}
            </Text>
          ) : null}
          <Pressable style={styles.button} onPress={this.reset} accessibilityRole="button">
            <Text style={styles.buttonText}>Tentar de novo</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#F2F2F7",
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  body: {
    fontSize: 17,
    color: "#3C3C43",
    marginBottom: 12,
  },
  detail: {
    fontSize: 13,
    fontFamily: "monospace",
    color: "#8E8E93",
    marginBottom: 20,
  },
  button: {
    alignSelf: "flex-start",
    backgroundColor: "#5E5CE6",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "600",
  },
});

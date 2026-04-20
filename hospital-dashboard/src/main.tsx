import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/900.css";
import "./index.css";
/** Estilos legados (modal paciente, heatmaps, auth-shell) — UI principal usa Tailwind. */
import "./App.css";
import { Toaster } from "sonner";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary title="OncoCare — erro">
      <BrowserRouter>
        <App />
        <Toaster position="top-right" richColors closeButton />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);

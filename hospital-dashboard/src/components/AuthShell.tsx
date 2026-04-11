import type { FormEvent } from "react";

type AuthView = "login" | "cadastro";

type Props = {
  authView: AuthView;
  onAuthViewChange: (v: AuthView) => void;
  email: string;
  onEmailChange: (v: string) => void;
  password: string;
  onPasswordChange: (v: string) => void;
  fullName: string;
  onFullNameChange: (v: string) => void;
  authError: string | null;
  authInfo: string | null;
  authBusy: boolean;
  onSignIn: (e: FormEvent<HTMLFormElement>) => void;
  onSignUp: (e: FormEvent<HTMLFormElement>) => void;
};

export function AuthShell({
  authView,
  onAuthViewChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  fullName,
  onFullNameChange,
  authError,
  authInfo,
  authBusy,
  onSignIn,
  onSignUp,
}: Props) {
  return (
    <div className="glass-root">
      <a href="#login-card" className="skip-link">
        Ir para o formulário
      </a>
      <div className="auth-shell">
        <div className="auth-card" id="login-card">
          <div className="brand" style={{ marginBottom: "0.5rem" }}>
            <div className="brand-mark">A</div>
            <div>
              <div className="brand-text">Aura Onco</div>
              <div className="brand-sub">Hospital</div>
            </div>
          </div>
          <h1>Acesso ao hospital</h1>
          <p className="muted">Conta de gestão: triagem e prontuário no hospital demo.</p>

          <div className="auth-tabs">
            <button type="button" className={authView === "login" ? "tab active" : "tab"} onClick={() => onAuthViewChange("login")}>
              Entrar
            </button>
            <button type="button" className={authView === "cadastro" ? "tab active" : "tab"} onClick={() => onAuthViewChange("cadastro")}>
              Cadastro
            </button>
          </div>

          {authView === "login" ? (
            <form onSubmit={onSignIn} className="form">
              <label>
                E-mail
                <input type="email" autoComplete="username" value={email} onChange={(e) => onEmailChange(e.target.value)} required />
              </label>
              <label>
                Senha
                <input type="password" autoComplete="current-password" value={password} onChange={(e) => onPasswordChange(e.target.value)} required />
              </label>
              {authError ? <p className="error">{authError}</p> : null}
              {authInfo ? <p className="info">{authInfo}</p> : null}
              <button type="submit" disabled={authBusy}>
                {authBusy ? "Aguarde…" : "Entrar"}
              </button>
            </form>
          ) : (
            <form onSubmit={onSignUp} className="form">
              <label>
                Nome completo
                <input type="text" autoComplete="name" value={fullName} onChange={(e) => onFullNameChange(e.target.value)} required />
              </label>
              <label>
                E-mail
                <input type="email" autoComplete="username" value={email} onChange={(e) => onEmailChange(e.target.value)} required />
              </label>
              <label>
                Senha
                <input type="password" autoComplete="new-password" value={password} onChange={(e) => onPasswordChange(e.target.value)} required minLength={6} />
              </label>
              {authError ? <p className="error">{authError}</p> : null}
              {authInfo ? <p className="info">{authInfo}</p> : null}
              <button type="submit" disabled={authBusy}>
                {authBusy ? "Criando conta…" : "Criar conta e vincular ao hospital demo"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

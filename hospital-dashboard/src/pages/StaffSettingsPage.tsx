import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatAuthError } from "@/authErrors";
import { useOncoCare } from "@/context/OncoCareContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function StaffSettingsPage() {
  const { reloadStaffProfile } = useOncoCare();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [passwordNew, setPasswordNew] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: s } = await supabase.auth.getSession();
      const u = s.session?.user;
      setEmail(u?.email ?? "");
      const uid = u?.id;
      if (!uid) return;
      const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle();
      setFullName(typeof prof?.full_name === "string" ? prof.full_name : "");
    })();
  }, []);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user?.id;
    if (!uid) return;
    const t = fullName.trim();
    if (!t) {
      setErr("Informe o nome.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ full_name: t }).eq("id", uid);
    setBusy(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Nome atualizado.");
    await reloadStaffProfile();
  }

  async function changeEmail(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    const next = newEmail.trim().toLowerCase();
    if (!next || !next.includes("@")) {
      setErr("Informe um e-mail válido.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ email: next });
    setBusy(false);
    if (error) {
      setErr(formatAuthError(error));
      return;
    }
    setMsg(
      "Se o projeto exige confirmação, verifique a caixa de entrada do novo e-mail. Até confirmar, o login pode continuar com o e-mail anterior."
    );
    setNewEmail("");
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (passwordNew.length < 6) {
      setErr("A senha deve ter pelo menos 6 caracteres.");
      return;
    }
    if (passwordNew !== passwordConfirm) {
      setErr("A confirmação não coincide com a nova senha.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: passwordNew });
    setBusy(false);
    if (error) {
      setErr(formatAuthError(error));
      return;
    }
    setMsg("Senha atualizada.");
    setPasswordNew("");
    setPasswordConfirm("");
  }

  function requestBrowserNotifications() {
    setErr(null);
    setMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setErr("Notificações do navegador não estão disponíveis neste ambiente.");
      return;
    }
    void Notification.requestPermission().then((p) => {
      if (p === "granted") setMsg("Notificações permitidas neste navegador.");
      else if (p === "denied") setErr("Permissão negada. Ative nas definições do navegador se quiser alertas.");
      else setMsg("Permissão não concedida.");
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="icon" className="rounded-2xl border-[3px]" asChild>
          <Link to="/" aria-label="Voltar ao painel">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Conta e preferências</h1>
          <p className="text-sm text-muted-foreground">Nome, e-mail, senha e notificações do navegador.</p>
        </div>
      </div>

      {err ? <p className="text-sm text-[#B91C1C]">{err}</p> : null}
      {msg ? <p className="text-sm text-[#059669]">{msg}</p> : null}

      <Card className="rounded-[24px] border-[3px] border-[#F3F4F6]">
        <CardHeader>
          <CardTitle className="text-lg">Perfil</CardTitle>
          <CardDescription>Nome exibido na barra superior e nas ações da equipe.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={saveName}>
            <label className="block text-sm font-medium">
              Nome completo
              <Input
                className="mt-1 rounded-2xl border-[3px]"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                autoComplete="name"
              />
            </label>
            <Button type="submit" className="rounded-2xl" disabled={busy}>
              {busy ? "A guardar…" : "Guardar nome"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-[3px] border-[#F3F4F6]">
        <CardHeader>
          <CardTitle className="text-lg">E-mail de acesso</CardTitle>
          <CardDescription>
            E-mail atual: <span className="font-medium text-foreground">{email || "—"}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={changeEmail}>
            <label className="block text-sm font-medium">
              Novo e-mail
              <Input
                type="email"
                className="mt-1 rounded-2xl border-[3px]"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                autoComplete="email"
                placeholder="novo@email.com"
              />
            </label>
            <Button type="submit" variant="secondary" className="rounded-2xl" disabled={busy}>
              Pedir alteração de e-mail
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-[3px] border-[#F3F4F6]">
        <CardHeader>
          <CardTitle className="text-lg">Segurança</CardTitle>
          <CardDescription>Defina uma nova senha para esta sessão.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={changePassword}>
            <label className="block text-sm font-medium">
              Nova senha
              <Input
                type="password"
                className="mt-1 rounded-2xl border-[3px]"
                value={passwordNew}
                onChange={(e) => setPasswordNew(e.target.value)}
                autoComplete="new-password"
                minLength={6}
              />
            </label>
            <label className="block text-sm font-medium">
              Confirmar nova senha
              <Input
                type="password"
                className="mt-1 rounded-2xl border-[3px]"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </label>
            <Button type="submit" variant="secondary" className="rounded-2xl" disabled={busy}>
              Atualizar senha
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="rounded-[24px] border-[3px] border-[#F3F4F6]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="size-5" />
            <CardTitle className="text-lg">Notificações</CardTitle>
          </div>
          <CardDescription>
            Os alertas de triagem e dossiê aparecem no painel em tempo real. Para lembretes fora do site, pode permitir notificações do
            navegador (quando suportado).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="outline" className="rounded-2xl border-[3px]" onClick={requestBrowserNotifications}>
            Pedir permissão de notificações no navegador
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const body = mode === "login"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Erro desconhecido."); return; }
      router.push("/app");
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">💬</div>
        <h1 className="login-title">Contatinhos</h1>
        <p className="login-sub">
          {mode === "login"
            ? "Entre para falar com seus 24 contatos"
            : "Crie sua conta para começar as conversas"}
        </p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={submit}>
          {mode === "register" && (
            <div className="form-field">
              <label className="form-label">Seu nome</label>
              <input
                className="form-input"
                type="text"
                placeholder="Como você quer ser chamado?"
                value={form.name}
                onChange={update("name")}
                required
                autoComplete="name"
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label">E-mail</label>
            <input
              className="form-input"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={update("email")}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-field">
            <label className="form-label">Senha</label>
            <input
              className="form-input"
              type="password"
              placeholder={mode === "register" ? "Mínimo 6 caracteres" : "••••••"}
              value={form.password}
              onChange={update("password")}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="login-toggle">
          {mode === "login" ? "Não tem conta?" : "Já tem conta?"}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Cadastre-se" : "Entrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI } from "@/integrations/auth/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { useThemeConfig, getDefaultConfigByHost } from "@/contexts/ThemeConfigContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const LOGIN_BACKGROUND_URL =
  "https://img.freepik.com/fotos-gratis/nuvens-brancas-dramaticas-e-ceu-azul-da-vista-da-janela-do-aviao-fundo-colorido-do-por-do-sol-cloudscape_90220-1209.jpg";
const SUPPORT_WHATSAPP_NUMBER = "5519991979912";
const SUPPORT_WHATSAPP_URL = `https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Olá, preciso de ajuda para acessar o Ativa FIX."
)}`;

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error && error.message ? error.message : fallback;
};

const Auth = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { config } = useThemeConfig();
  const logoUrl = getDefaultConfigByHost().logo || "/logo-ativafix.png";
  const currentYear = new Date().getFullYear();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState(() => localStorage.getItem("auth_remembered_email") || "");
  const [password, setPassword] = useState("");
  const [rememberLogin, setRememberLogin] = useState(() => Boolean(localStorage.getItem("auth_remembered_email")));
  const [authMode, setAuthMode] = useState<"signin" | "reset">("signin");
  // Bloqueio de novas tentativas após 429 (muitas tentativas) — evita enviar mais requisições e piorar o bloqueio
  const [lockLoginUntil, setLockLoginUntil] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSupportBubble, setShowSupportBubble] = useState(false);

  useEffect(() => {
    if (rememberLogin && email.trim()) {
      localStorage.setItem("auth_remembered_email", email.trim());
      return;
    }

    if (!rememberLogin) {
      localStorage.removeItem("auth_remembered_email");
    }
  }, [email, rememberLogin]);

  useEffect(() => {
    // Se já está autenticado, redirecionar
    if (!authLoading && user) {
      navigate("/");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const showTimer = window.setTimeout(() => setShowSupportBubble(true), 2500);
    const hideTimer = window.setTimeout(() => setShowSupportBubble(false), 8500);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  // Contagem regressiva do bloqueio de login (atualiza a cada segundo)
  const [lockSecondsLeft, setLockSecondsLeft] = useState(0);
  useEffect(() => {
    if (lockLoginUntil == null) {
      setLockSecondsLeft(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((lockLoginUntil - Date.now()) / 1000));
      setLockSecondsLeft(left);
      if (left <= 0) setLockLoginUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lockLoginUntil]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockLoginUntil != null && Date.now() < lockLoginUntil) return;

    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Auth] Tentando fazer login via API PostgreSQL:', { email });

      const response = await authAPI.login(email, password);

      if (response.error) {
        throw new Error(response.error.message || "Erro ao fazer login");
      }

      toast({
        title: "Login realizado",
        description: "Bem-vindo de volta!",
      });

      if (rememberLogin) {
        localStorage.setItem("auth_remembered_email", email.trim());
      } else {
        localStorage.removeItem("auth_remembered_email");
      }

      window.location.href = "/";
    } catch (error: unknown) {
      console.error("[Auth] Erro no login:", error);
      const msg = getErrorMessage(error, "Email ou senha incorretos.");
      const isTooManyRequests = typeof msg === "string" && (msg.includes("Muitas tentativas") || msg.includes("429"));
      if (isTooManyRequests) {
        setLockLoginUntil(Date.now() + 45 * 1000); // 45 segundos (evita novo 429 ao tentar de novo)
      }
      toast({
        title: "Erro no login",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, digite seu email",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      console.log('[Auth] Solicitando reset de senha via API PostgreSQL:', { email });
      
      // Usar authAPI para solicitar reset
      await authAPI.requestPasswordReset(email);

      toast({
        title: "Email enviado",
        description: "Se o email existir, você receberá um link para redefinir sua senha.",
      });
      setEmail("");
    } catch (error: unknown) {
      console.error('[Auth] Erro ao solicitar reset:', error);
      const msg = getErrorMessage(error, "Erro ao enviar email de redefinição");
      toast({
        title: "Erro",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-hidden bg-slate-950 bg-cover bg-center bg-no-repeat text-slate-700 dark:text-slate-200"
      style={{ backgroundImage: `url(${LOGIN_BACKGROUND_URL})` }}
    >
      <div className="absolute inset-0 bg-slate-950/30 dark:bg-slate-950/60" aria-hidden="true" />

      <div className="absolute right-4 top-4 z-20 rounded-full bg-white/90 shadow-lg backdrop-blur dark:bg-slate-900/90">
        <ThemeToggle variant="button" size="sm" />
      </div>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-[372px] rounded-[18px] bg-white px-7 py-8 shadow-2xl dark:bg-slate-900 sm:px-8 sm:py-9">
          <div className="mb-7 flex justify-center">
            <img
              src={logoUrl}
              alt={config.logoAlt || config.companyName || "Ativa FIX"}
              className="h-16 w-auto max-w-[225px] object-contain"
              loading="eager"
              decoding="async"
            />
          </div>

          {authMode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-5" autoComplete="on">
              {/* Email */}
              <div className="group relative pt-2.5">
                <label
                  htmlFor="signin-email"
                  className="absolute left-4 top-2.5 z-10 -translate-y-1/2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500 transition-colors group-hover:text-emerald-500 group-focus-within:text-emerald-500 dark:bg-slate-900 dark:text-slate-400"
                >
                  Email *
                </label>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-[44px] rounded-2xl border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-none hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Senha */}
              <div className="group relative pt-2.5">
                <label
                  htmlFor="signin-password"
                  className="absolute left-4 top-2.5 z-10 -translate-y-1/2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500 transition-colors group-hover:text-emerald-500 group-focus-within:text-emerald-500 dark:bg-slate-900 dark:text-slate-400"
                >
                  Senha *
                </label>
                <div className="relative">
                  <Input
                    id="signin-password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="h-[44px] rounded-2xl border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 shadow-none hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none dark:text-slate-400 dark:hover:text-white"
                    tabIndex={-1}
                    aria-label={showPassword ? "Ocultar senha" : "Exibir senha"}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  id="remember-login"
                  type="button"
                  role="checkbox"
                  aria-checked={rememberLogin}
                  onClick={() => setRememberLogin((v) => !v)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                    rememberLogin
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-slate-400 bg-white text-transparent dark:border-slate-500 dark:bg-slate-900"
                  }`}>
                    <Check className="h-3 w-3" />
                  </span>
                  <span className="text-xs font-normal text-emerald-500">Salvar login</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAuthMode("reset")}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#75c7ad] transition-colors hover:text-[#4da989] hover:underline"
                >
                  <KeyRound className="h-4 w-4 text-amber-400" />
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                className="h-[44px] w-full rounded-full bg-[#75c7ad] text-sm font-semibold text-white shadow-none hover:bg-[#63b99e]"
                disabled={loading || lockSecondsLeft > 0}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : lockSecondsLeft > 0 ? (
                  <>Aguarde {lockSecondsLeft} s para tentar de novo</>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="text-center">
                <h1 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Recuperar senha</h1>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                  Digite seu email para receber um link de redefinição.
                </p>
              </div>

              <div className="group relative pt-2.5">
                <label
                  htmlFor="reset-email"
                  className="absolute left-4 top-2.5 z-10 -translate-y-1/2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500 transition-colors group-hover:text-emerald-500 group-focus-within:text-emerald-500 dark:bg-slate-900 dark:text-slate-400"
                >
                  Email *
                </label>
                <Input
                  id="reset-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="h-[44px] rounded-2xl border-slate-200 bg-white px-4 text-sm text-slate-900 shadow-none hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <Button
                type="submit"
                className="h-[34px] w-full rounded-full bg-[#75c7ad] text-sm font-semibold text-white shadow-none hover:bg-[#63b99e]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de redefinição"
                )}
              </Button>

              <button
                type="button"
                onClick={() => setAuthMode("signin")}
                className="text-sm font-semibold text-[#75c7ad] transition-colors hover:text-[#4da989] hover:underline"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 pb-4 text-center text-[11px] text-white/65">
        <div className="mb-1 flex justify-center gap-4">
          <button
            type="button"
            onClick={() => navigate("/politica-de-privacidade")}
            className="underline-offset-2 hover:text-white hover:underline"
          >
            Política de Privacidade
          </button>
          <button
            type="button"
            onClick={() => navigate("/termos-de-uso")}
            className="underline-offset-2 hover:text-white hover:underline"
          >
            Termos de Uso
          </button>
        </div>
        <p>© {currentYear} Ativa FIX. Todos os direitos reservados.</p>
      </footer>

      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-20 flex items-end gap-2"
        aria-label="Abrir suporte no WhatsApp"
      >
        <span
          className={`mb-1 hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xl transition-all duration-300 sm:inline ${
            showSupportBubble ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"
          }`}
        >
          Como podemos ajudar?
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] shadow-xl transition-transform hover:scale-105">
          <img src="/whatsapp-logo.png" alt="" className="h-8 w-8 object-contain" />
        </span>
      </a>
    </div>
  );
};

export default Auth;

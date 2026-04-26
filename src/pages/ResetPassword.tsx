import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { authAPI } from "@/integrations/auth/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { getDefaultConfigByHost } from "@/contexts/ThemeConfigContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const LOGIN_BACKGROUND_URL =
  "https://img.freepik.com/fotos-gratis/nuvens-brancas-dramaticas-e-ceu-azul-da-vista-da-janela-do-aviao-fundo-colorido-do-por-do-sol-cloudscape_90220-1209.jpg";

/** Decodifica o payload do JWT sem verificar assinatura (só pra exibir email). */
const decodeJwtPayload = (token: string): Record<string, string> | null => {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
};

/** Mascara email: larissamanusts@gmail.com → l***@gmail.com */
const maskEmail = (email: string): string => {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  return `${user[0]}***@${domain}`;
};

type PasswordStrength = { level: 0 | 1 | 2 | 3 | 4; label: string; color: string };

const getPasswordStrength = (pwd: string): PasswordStrength => {
  if (!pwd) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd) && /[^A-Za-z0-9]/.test(pwd)) score++;
  const map: PasswordStrength[] = [
    { level: 0, label: "", color: "" },
    { level: 1, label: "Fraca", color: "bg-red-500" },
    { level: 2, label: "Razoável", color: "bg-amber-400" },
    { level: 3, label: "Boa", color: "bg-emerald-400" },
    { level: 4, label: "Forte", color: "bg-emerald-600" },
  ];
  return map[score] ?? map[1];
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const logoUrl = getDefaultConfigByHost().logo || "/logo-ativafix.png";
  const currentYear = new Date().getFullYear();

  // Suporta ?access_token= (padrão do backend) ou ?token= como fallback
  const token = searchParams.get("access_token") || searchParams.get("token") || "";

  const tokenPayload = useMemo(() => decodeJwtPayload(token), [token]);
  const emailFromToken = tokenPayload?.email || "";
  const maskedEmail = emailFromToken ? maskEmail(emailFromToken) : "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  // Redireciona pra /login se não há token na URL
  useEffect(() => {
    if (!token) {
      toast({
        title: "Link inválido",
        description: "O link de redefinição é inválido ou expirou. Solicite um novo.",
        variant: "destructive",
      });
      navigate("/login", { replace: true });
    }
  }, [token, navigate, toast]);

  // Redireciona após sucesso
  useEffect(() => {
    if (!done) return;
    const id = window.setTimeout(() => navigate("/login", { replace: true }), 3000);
    return () => window.clearTimeout(id);
  }, [done, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirm) {
      toast({
        title: "Senhas diferentes",
        description: "A confirmação não confere com a nova senha.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await authAPI.confirmPasswordReset(token, password);

      if (response.error) {
        throw new Error(response.error.message);
      }

      setDone(true);
      toast({
        title: "Senha redefinida!",
        description: "Sua senha foi alterada com sucesso. Redirecionando para o login...",
      });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao redefinir senha";
      const isExpired = msg.toLowerCase().includes("expirad") || msg.toLowerCase().includes("invalid");
      toast({
        title: isExpired ? "Link expirado" : "Erro",
        description: isExpired
          ? "Este link já expirou ou é inválido. Solicite um novo em 'Esqueci minha senha'."
          : msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

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
          {/* Logo */}
          <div className="mb-7 flex justify-center">
            <img
              src={logoUrl}
              alt="Ativa FIX"
              className="h-16 w-auto max-w-[225px] object-contain"
              loading="eager"
              decoding="async"
            />
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                <svg className="h-7 w-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">Senha redefinida!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Redirecionando para o login...</p>
              <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center">
                <h1 className="flex items-center justify-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
                  <KeyRound className="h-5 w-5 text-amber-400" />
                  Definir nova senha
                </h1>
                {maskedEmail && (
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Conta: <span className="font-medium text-slate-700 dark:text-slate-300">{maskedEmail}</span>
                  </p>
                )}
              </div>

              {/* Nova senha */}
              <div className="group relative">
                <label
                  htmlFor="new-password"
                  className="absolute left-4 top-0 z-10 h-auto min-h-0 min-w-0 -translate-y-1/2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500 transition-colors group-hover:text-emerald-500 group-focus-within:text-emerald-500 dark:bg-slate-900 dark:text-slate-400"
                >
                  Nova senha *
                </label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    className="h-[44px] rounded-full border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 shadow-none hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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

                {/* Barra de força da senha */}
                {password.length > 0 && (
                  <div className="mt-1 flex items-center gap-2 px-1">
                    <div className="flex flex-1 gap-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            i <= strength.level ? strength.color : "bg-slate-200 dark:bg-slate-700"
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 w-14 text-right">
                      {strength.label}
                    </span>
                  </div>
                )}
              </div>

              {/* Confirmar senha */}
              <div className="group relative">
                <label
                  htmlFor="confirm-password"
                  className="absolute left-4 top-0 z-10 h-auto min-h-0 min-w-0 -translate-y-1/2 bg-white px-1 text-[11px] font-medium leading-none text-slate-500 transition-colors group-hover:text-emerald-500 group-focus-within:text-emerald-500 dark:bg-slate-900 dark:text-slate-400"
                >
                  Confirmar senha *
                </label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                    className="h-[44px] rounded-full border-slate-200 bg-white px-4 pr-11 text-sm text-slate-900 shadow-none hover:border-emerald-400 focus-visible:border-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-700 focus:outline-none dark:text-slate-400 dark:hover:text-white"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Ocultar confirmação" : "Exibir confirmação"}
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="h-[34px] w-full rounded-full bg-[#75c7ad] text-sm font-semibold text-white shadow-none hover:bg-[#63b99e]"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar nova senha"
                )}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/login")}
                className="block w-full text-center text-sm font-semibold text-[#75c7ad] transition-colors hover:text-[#4da989] hover:underline"
              >
                Voltar para o login
              </button>
            </form>
          )}
        </section>
      </main>

      <footer className="relative z-10 pb-4 text-center text-[11px] text-white/65">
        <p>© {currentYear} Ativa FIX. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default ResetPassword;

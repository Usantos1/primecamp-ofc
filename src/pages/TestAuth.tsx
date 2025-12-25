// 🧪 PÁGINA DE TESTE - AUTENTICAÇÃO POSTGRESQL
// Esta página usa APENAS a API PostgreSQL, SEM Supabase

import React, { useState } from "react";
import { authAPI } from "@/integrations/auth/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn, UserPlus, CheckCircle, XCircle } from "lucide-react";

// Detectar se está em desenvolvimento local ou produção
const API_URL = import.meta.env.VITE_API_URL || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:3000/api' 
    : 'https://api.primecamp.cloud/api');

// Garantir que este componente seja incluído no bundle
console.log('🧪 TestAuth component loaded');

const TestAuth = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [result, setResult] = useState<any>(null);
  const [testMode, setTestMode] = useState<'login' | 'signup'>('login');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Erro",
        description: "Preencha email e senha",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 [TEST] Iniciando teste de login...');
      console.log('🧪 [TEST] API_URL:', API_URL);
      console.log('🧪 [TEST] Email:', email);
      
      // 🚫 NÃO USAR SUPABASE - APENAS API PostgreSQL
      const response = await authAPI.login({ email, password });
      
      console.log('🧪 [TEST] Login bem-sucedido:', response);
      
      setResult({
        success: true,
        data: response,
        message: 'Login realizado com sucesso!'
      });
      
      toast({
        title: "✅ Sucesso",
        description: "Login realizado com sucesso!",
      });
    } catch (error: any) {
      console.error('🧪 [TEST] Erro no login:', error);
      
      setResult({
        success: false,
        error: error.message || 'Erro desconhecido',
        message: 'Erro ao fazer login'
      });
      
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao fazer login",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setResult(null);
    
    try {
      console.log('🧪 [TEST] Iniciando teste de cadastro...');
      console.log('🧪 [TEST] API_URL:', API_URL);
      console.log('🧪 [TEST] Email:', email);
      
      const response = await authAPI.signup({
        email,
        password,
        display_name: displayName || email.split('@')[0],
      });
      
      console.log('🧪 [TEST] Cadastro bem-sucedido:', response);
      
      setResult({
        success: true,
        data: response,
        message: 'Cadastro realizado com sucesso!'
      });
      
      toast({
        title: "✅ Sucesso",
        description: "Cadastro realizado com sucesso!",
      });
    } catch (error: any) {
      console.error('🧪 [TEST] Erro no cadastro:', error);
      
      setResult({
        success: false,
        error: error.message || 'Erro desconhecido',
        message: 'Erro ao criar conta'
      });
      
      toast({
        title: "❌ Erro",
        description: error.message || "Erro ao criar conta",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testAPIHealth = async () => {
    setLoading(true);
    try {
      console.log('🧪 [TEST] Testando saúde da API...');
      // Testar endpoint de login (não precisa de token)
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
      });
      
      const data = await response.json();
      
      // Se retornar erro de credenciais, a API está funcionando!
      if (response.status === 401 && data.error) {
        setResult({
          success: true,
          data: { message: 'API está respondendo! Endpoint de login funcionando.', error: data.error },
          message: '✅ API está funcionando! (Erro 401 é esperado com credenciais inválidas)'
        });
      } else {
        setResult({
          success: response.ok,
          data: data,
          message: response.ok ? 'API está respondendo!' : 'API retornou erro'
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        message: 'Erro ao conectar com a API'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            🧪 Página de Teste - Autenticação PostgreSQL
          </CardTitle>
          <CardDescription>
            Teste isolado usando APENAS API PostgreSQL (SEM Supabase)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm font-mono">
              <strong>API URL:</strong> {API_URL}
            </p>
            <p className="text-sm mt-2">
              Esta página usa <strong>APENAS</strong> a API PostgreSQL. 
              Nenhuma requisição será feita ao Supabase.
            </p>
          </div>

          {/* Test API Health */}
          <div>
            <Button onClick={testAPIHealth} disabled={loading} variant="outline">
              Testar Conexão com API
            </Button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => { setTestMode('login'); setResult(null); }}
              className={`px-4 py-2 font-medium ${testMode === 'login' ? 'border-b-2 border-primary' : ''}`}
            >
              Login
            </button>
            <button
              onClick={() => { setTestMode('signup'); setResult(null); }}
              className={`px-4 py-2 font-medium ${testMode === 'signup' ? 'border-b-2 border-primary' : ''}`}
            >
              Cadastro
            </button>
          </div>

          {/* Login Form */}
          {testMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-email">Email</Label>
                <Input
                  id="test-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-password">Senha</Label>
                <Input
                  id="test-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Testar Login
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Signup Form */}
          {testMode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-signup-name">Nome (opcional)</Label>
                <Input
                  id="test-signup-name"
                  type="text"
                  placeholder="Seu nome"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-signup-email">Email</Label>
                <Input
                  id="test-signup-email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-signup-password">Senha</Label>
                <Input
                  id="test-signup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="test-signup-confirm">Confirmar Senha</Label>
                <Input
                  id="test-signup-confirm"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Testando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Testar Cadastro
                  </>
                )}
              </Button>
            </form>
          )}

          {/* Result */}
          {result && (
            <div className={`p-4 rounded-lg ${result.success ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <div className="flex items-center gap-2 mb-2">
                {result.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <h3 className="font-bold">{result.message}</h3>
              </div>
              {result.error && (
                <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                  {result.error}
                </p>
              )}
              {result.data && (
                <pre className="text-xs mt-4 p-2 bg-black/10 dark:bg-white/10 rounded overflow-auto max-h-60">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm font-semibold mb-2">📋 Instruções:</p>
            <ol className="text-sm list-decimal list-inside space-y-1">
              <li>Abra o Console do navegador (F12)</li>
              <li>Verifique se há requisições para <code className="bg-black/10 px-1 rounded">supabase.co</code></li>
              <li>Deve aparecer apenas requisições para <code className="bg-black/10 px-1 rounded">api.primecamp.cloud</code></li>
              <li>Teste login com um usuário da tabela <code className="bg-black/10 px-1 rounded">users</code> do PostgreSQL</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestAuth;


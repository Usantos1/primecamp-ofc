import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, User, ExternalLink, Building2 } from 'lucide-react';

export default function JobSuccess() {
  const { protocol: urlProtocol } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  
  // Suporta protocolo tanto como parâmetro da URL quanto como query parameter
  const protocol = urlProtocol || searchParams.get('proto');

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">Carregando...</div>
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Protocolo inválido</p>
            <Button onClick={() => navigate('/vagas')} className="mt-4">
              Ver Outras Vagas
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30 p-4">
      <div className="max-w-2xl mx-auto space-y-6 pt-8">
        {/* Header */}
        <Card className="border-0 shadow-lg bg-gradient-to-r from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
              <Building2 className="h-8 w-8" />
              <span className="text-2xl font-bold">Prime Camp</span>
            </div>
            <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto" />
            <div>
              <CardTitle className="text-3xl font-bold text-green-800 dark:text-green-200">
                Candidatura Enviada com Sucesso!
              </CardTitle>
              <CardDescription className="text-lg mt-2 text-green-700 dark:text-green-300">
                Protocolo: <span className="font-mono font-bold">{protocol}</span>
              </CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Sucesso e próximos passos */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-800 dark:text-green-200">
              Sua candidatura foi registrada!
            </CardTitle>
            <CardDescription>
              Guarde o protocolo <span className="font-mono font-semibold">{protocol}</span> para acompanhar o status da sua candidatura.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Próximos Passos:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Nossa equipe analisará sua candidatura
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Entraremos em contato em até 5 dias úteis
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Use o protocolo para acompanhar o status
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Teste DISC Opcional */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 text-primary mb-2">
              <User className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl">Teste DISC Opcional</CardTitle>
            <CardDescription>
              Que tal fazer um teste de perfil comportamental? É rápido, gratuito e pode destacar sua candidatura!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • Avalia seu perfil comportamental DISC
              </p>
              <p className="text-sm text-muted-foreground">
                • Leva apenas 5-10 minutos
              </p>
              <p className="text-sm text-muted-foreground">
                • Pode destacar sua candidatura no processo seletivo
              </p>
              <p className="text-sm text-muted-foreground">
                • Resultado imediato e gratuito
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
                onClick={() => window.open(`/candidato-disc?job_protocol=${protocol}`, '_blank')}
                className="flex-1 flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Fazer Teste DISC Agora
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/vagas')}
                className="flex-1"
              >
                Ver Outras Vagas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center text-muted-foreground text-sm">
          <p>
            Tem dúvidas? Entre em contato conosco através dos nossos canais oficiais.
          </p>
        </div>
      </div>
    </div>
  );
}
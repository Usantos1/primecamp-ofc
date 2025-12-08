import { useState, useEffect } from 'react';
import { ModernLayout } from "@/components/ModernLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Brain, Play, History, Info, Trophy } from "lucide-react";
import { useDiscTest } from "@/hooks/useDiscTest";
import { DiscTestForm } from "@/components/DiscTestForm";
import { EnhancedDiscTestResults } from "@/components/EnhancedDiscTestResults";
import { DiscTestHistory } from "@/components/DiscTestHistory";
import { useToast } from "@/hooks/use-toast";

export default function DiscTest() {
  const [activeTab, setActiveTab] = useState("intro");
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const { toast } = useToast();
const {
    isCompleted,
    result,
    hasInProgressTest,
    currentQuestionIndex,
    startTest,
    resetTest
  } = useDiscTest();

  // Auto-navegação para resultado quando teste completa
  useEffect(() => {
    console.log('[DISC] Verificando estados para navegação:', { 
      isCompleted, 
      hasResult: !!result, 
      activeTab
    });
    
    // Navegar automaticamente quando teste é completado
    if (isCompleted && result && activeTab === "test") {
      console.log('[DISC] Teste completado, navegando para resultado automaticamente');
      setTimeout(() => {
        setActiveTab("result");
        toast({
          title: "Teste concluído! 🎉",
          description: "Seu perfil DISC foi calculado com sucesso."
        });
      }, 1000); // Delay de 1 segundo para mostrar feedback visual
    }
  }, [isCompleted, result, activeTab, toast]);

  const handleStartTest = () => {
    if (hasInProgressTest) {
      setShowResumeDialog(true);
    } else {
      setActiveTab("test");
      startTest();
    }
  };

  const handleResumeTest = () => {
    setShowResumeDialog(false);
    setActiveTab("test");
  };

  const handleNewTest = () => {
    setShowResumeDialog(false);
    resetTest();
    setActiveTab("test");
    startTest();
  };

  const handleTestComplete = () => {
    console.log('[DISC] handleTestComplete chamado');
    // A navegação automática será feita pelo useEffect
  };

  const handleRestart = () => {
    resetTest();
    setActiveTab("intro");
  };

  return (
    <ModernLayout 
      title="Teste DISC - PrimeCamp"
      subtitle="Descubra seu perfil comportamental através de perguntas objetivas"
    >
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="intro" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Introdução
            </TabsTrigger>
            <TabsTrigger value="test" disabled={!hasInProgressTest && activeTab !== "test"} className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Teste
            </TabsTrigger>
            <TabsTrigger value="result" disabled={!result} className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Resultado
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="intro" className="space-y-6">
            {/* Introdução ao Teste DISC */}
            <Card className="border-primary/20">
              <CardHeader className="text-center">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Brain className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Avaliação de Perfil DISC</CardTitle>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  O teste DISC é uma ferramenta de avaliação comportamental que identifica como você se comporta em diferentes situações profissionais e pessoais.
                </p>
              </CardHeader>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              {/* O que você vai descobrir */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">O que você vai descobrir</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-sm font-bold text-red-600 dark:text-red-300">D</div>
                      <div>
                        <h4 className="font-semibold">Dominância</h4>
                        <p className="text-sm text-muted-foreground">Como você enfrenta problemas e desafios</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-300">I</div>
                      <div>
                        <h4 className="font-semibold">Influência</h4>
                        <p className="text-sm text-muted-foreground">Como você influencia e se relaciona com pessoas</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-sm font-bold text-green-600 dark:text-green-300">S</div>
                      <div>
                        <h4 className="font-semibold">Estabilidade</h4>
                        <p className="text-sm text-muted-foreground">Como você responde ao ritmo e mudanças</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center text-sm font-bold text-yellow-600 dark:text-yellow-300">C</div>
                      <div>
                        <h4 className="font-semibold">Conformidade</h4>
                        <p className="text-sm text-muted-foreground">Como você segue regras e procedimentos</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Como funciona */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Como funciona</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">1</div>
                      <p className="text-sm">Responda 20 perguntas objetivas</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">2</div>
                      <p className="text-sm">Escolha a opção que mais se identifica com você</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">3</div>
                      <p className="text-sm">Receba seu perfil detalhado com gráficos</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">4</div>
                      <p className="text-sm">Exporte seu resultado em PDF</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Informações importantes */}
            <Card className="bg-accent/30">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-primary">Informações importantes:</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• O teste leva aproximadamente 10-15 minutos para ser concluído</li>
                    <li>• Responda com base em seu comportamento natural, não no que acredita ser esperado</li>
                    <li>• Não existem respostas certas ou erradas</li>
                    <li>• Seu progresso é salvo automaticamente</li>
                    <li>• Você pode pausar e retomar o teste a qualquer momento</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Botão para iniciar */}
            <div className="text-center">
              <Button 
                size="lg" 
                onClick={handleStartTest}
                className="text-lg px-8 py-3"
              >
                <Play className="h-5 w-5 mr-2" />
                {hasInProgressTest ? "Continuar Teste" : "Iniciar Teste DISC"}
              </Button>
              {hasInProgressTest && (
                <p className="text-sm text-muted-foreground mt-2">
                  Você tem um teste em progresso
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="test">
            {isCompleted && result ? (
              <EnhancedDiscTestResults 
                result={result} 
                onRestart={handleRestart}
              />
            ) : (
              <DiscTestForm onComplete={handleTestComplete} />
            )}
          </TabsContent>

          <TabsContent value="result">
            {result && (
              <EnhancedDiscTestResults 
                result={result} 
                onRestart={handleRestart}
              />
            )}
          </TabsContent>

          <TabsContent value="history">
            <DiscTestHistory />
          </TabsContent>
        </Tabs>

        {/* Dialog para retomar teste */}
        <AlertDialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Teste em Progresso</AlertDialogTitle>
              <AlertDialogDescription>
                Você tem um teste DISC em progresso. Deseja continuar de onde parou ou iniciar um novo teste?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleNewTest}>
                Novo Teste
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleResumeTest}>
                Continuar Teste
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ModernLayout>
  );
}
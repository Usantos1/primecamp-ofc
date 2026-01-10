import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText } from 'lucide-react';

// Perguntas do teste DISC (mesmo array usado em useCandidateDiscTest)
const DISC_QUESTIONS = [
  {
    id: 1,
    question: "Em situações de trabalho em equipe, eu tendo a:",
    options: {
      D: "Assumir a liderança e dirigir as ações",
      I: "Motivar e inspirar os outros membros",
      S: "Colaborar harmoniosamente e apoiar o grupo",
      C: "Analisar detalhadamente e garantir qualidade"
    }
  },
  {
    id: 2,
    question: "Quando enfrento um problema complexo, minha primeira reação é:",
    options: {
      D: "Buscar uma solução rápida e decisiva",
      I: "Discutir com outros para gerar ideias criativas",
      S: "Proceder com cautela e considerar todas as opções",
      C: "Pesquisar e analisar dados antes de agir"
    }
  },
  {
    id: 3,
    question: "No ambiente de trabalho, eu me sinto mais confortável quando:",
    options: {
      D: "Tenho autonomia para tomar decisões importantes",
      I: "Posso interagir e trabalhar com pessoas diversas",
      S: "Existe estabilidade e um ambiente previsível",
      C: "Tenho informações precisas e procedimentos claros"
    }
  },
  {
    id: 4,
    question: "Meu estilo de comunicação é caracterizado por:",
    options: {
      D: "Ser direto, objetivo e assertivo",
      I: "Ser expressivo, entusiasta e persuasivo",
      S: "Ser diplomático, paciente e compreensivo",
      C: "Ser preciso, factual e bem fundamentado"
    }
  },
  {
    id: 5,
    question: "Quando trabalho sob pressão, eu:",
    options: {
      D: "Mantenho o foco e tomo decisões rápidas",
      I: "Procuro apoio e motivação da equipe",
      S: "Me esforço para manter a calma e estabilidade",
      C: "Organizo metodicamente minhas tarefas"
    }
  },
  {
    id: 6,
    question: "Em reuniões, eu normalmente:",
    options: {
      D: "Conduzo discussões e busco resultados",
      I: "Contribuo com ideias e mantenho o ambiente positivo",
      S: "Escuto atentamente e apoio as decisões do grupo",
      C: "Apresento dados e questiono detalhes importantes"
    }
  },
  {
    id: 7,
    question: "Minha abordagem para resolver conflitos é:",
    options: {
      D: "Confrontar diretamente e buscar solução imediata",
      I: "Mediar com otimismo e buscar consenso",
      S: "Evitar confronto e buscar harmonia",
      C: "Analisar fatos e buscar solução lógica"
    }
  },
  {
    id: 8,
    question: "Quando preciso aprender algo novo, eu prefiro:",
    options: {
      D: "Ir direto à prática e aprender fazendo",
      I: "Aprender em grupo e trocar experiências",
      S: "Seguir um método estruturado e gradual",
      C: "Estudar teoria e detalhes antes de praticar"
    }
  },
  {
    id: 9,
    question: "Em projetos, eu me concentro principalmente em:",
    options: {
      D: "Entregar resultados no prazo estabelecido",
      I: "Criar sinergia e engajamento da equipe",
      S: "Garantir que todos se sintam incluídos",
      C: "Assegurar qualidade e precisão em cada etapa"
    }
  },
  {
    id: 10,
    question: "Minha reação a feedback crítico é:",
    options: {
      D: "Aceito e uso para melhorar rapidamente",
      I: "Preciso que seja dado de forma construtiva",
      S: "Prefiro receber de forma privada e cuidadosa",
      C: "Analiso em detalhes antes de aplicar"
    }
  },
  {
    id: 11,
    question: "Quando preciso tomar uma decisão importante:",
    options: {
      D: "Decido rapidamente baseado em minha experiência",
      I: "Consulto outras pessoas para validar ideias",
      S: "Preciso de tempo para considerar todas as implicações",
      C: "Coleto todos os dados possíveis antes de decidir"
    }
  },
  {
    id: 12,
    question: "No ambiente de trabalho, valorizo mais:",
    options: {
      D: "Autonomia e liberdade para agir",
      I: "Relacionamentos e reconhecimento",
      S: "Estabilidade e previsibilidade",
      C: "Precisão e qualidade nos processos"
    }
  },
  {
    id: 13,
    question: "Quando recebo uma nova tarefa:",
    options: {
      D: "Vou direto à ação e começo imediatamente",
      I: "Compartilho com a equipe e crio entusiasmo",
      S: "Planejo cuidadosamente antes de iniciar",
      C: "Analiso todos os requisitos em detalhes"
    }
  },
  {
    id: 14,
    question: "Minha motivação principal no trabalho é:",
    options: {
      D: "Alcançar resultados e superar desafios",
      I: "Trabalhar com pessoas e criar impacto positivo",
      S: "Manter estabilidade e contribuir consistentemente",
      C: "Realizar trabalhos de alta qualidade e precisão"
    }
  },
  {
    id: 15,
    question: "Em situações de mudança, eu:",
    options: {
      D: "Me adapto rapidamente e busco oportunidades",
      I: "Vejo o lado positivo e ajudo outros a se adaptarem",
      S: "Preciso de tempo para processar e me ajustar",
      C: "Analiso cuidadosamente os impactos antes de aceitar"
    }
  },
  {
    id: 16,
    question: "Quando trabalho em equipe, contribuo principalmente com:",
    options: {
      D: "Liderança e direcionamento claro",
      I: "Energia e motivação para o grupo",
      S: "Apoio e colaboração constante",
      C: "Análise cuidadosa e atenção aos detalhes"
    }
  },
  {
    id: 17,
    question: "Minha abordagem para atingir metas é:",
    options: {
      D: "Foco intenso e ação direta",
      I: "Criar sinergia e engajar a equipe",
      S: "Progresso constante e consistente",
      C: "Planejamento detalhado e execução precisa"
    }
  },
  {
    id: 18,
    question: "Em situações de incerteza, eu:",
    options: {
      D: "Ajo com confiança mesmo sem todas as informações",
      I: "Busco apoio e perspectiva de outros",
      S: "Preciso de mais informações antes de agir",
      C: "Pesquiso exaustivamente antes de decidir"
    }
  },
  {
    id: 19,
    question: "Minha forma preferida de receber instruções é:",
    options: {
      D: "Diretas e objetivas, com liberdade para executar",
      I: "Com contexto e explicação do propósito",
      S: "Claras e detalhadas, com suporte disponível",
      C: "Completas e precisas, com todos os detalhes"
    }
  },
  {
    id: 20,
    question: "No ambiente profissional, busco principalmente:",
    options: {
      D: "Desafios e oportunidades de crescimento",
      I: "Conexões significativas e reconhecimento",
      S: "Estabilidade e relacionamentos duradouros",
      C: "Excelência técnica e qualidade nos resultados"
    }
  }
];

interface DiscResponsesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  responses: Array<{ questionId: number; selectedType: string }>;
}

const profileColors: Record<string, string> = {
  'D': 'bg-red-50 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400',
  'I': 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400',
  'S': 'bg-green-50 border-green-300 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400',
  'C': 'bg-yellow-50 border-yellow-300 text-yellow-700 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-400'
};

const profileNames: Record<string, string> = {
  'D': 'Dominante',
  'I': 'Influente',
  'S': 'Estável',
  'C': 'Cauteloso'
};

export function DiscResponsesModal({ open, onOpenChange, responses }: DiscResponsesModalProps) {
  // Criar mapa de respostas por questionId para acesso rápido
  const responsesMap = new Map(
    responses.map(r => [r.questionId, r.selectedType])
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Respostas do Teste DISC
          </DialogTitle>
          <DialogDescription>
            Visualize todas as perguntas e respostas do teste
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {DISC_QUESTIONS.map((question, index) => {
            const selectedType = responsesMap.get(question.id);
            const selectedOption = selectedType ? question.options[selectedType as keyof typeof question.options] : null;
            
            return (
              <Card key={question.id}>
                <CardHeader>
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <span className="text-muted-foreground">Pergunta {index + 1}:</span>
                    {question.question}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm font-semibold mb-2">Opções:</div>
                    {Object.entries(question.options).map(([type, text]) => {
                      const isSelected = selectedType === type;
                      const colorClass = profileColors[type] || '';
                      
                      return (
                        <div
                          key={type}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? `${colorClass} font-semibold`
                              : 'border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/20'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={isSelected ? 'default' : 'outline'}
                                className={isSelected ? colorClass : ''}
                              >
                                {type}
                              </Badge>
                              <span>{text}</span>
                            </div>
                            {isSelected && (
                              <Badge variant="secondary" className="ml-2">
                                Selecionada
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, User, Users, Target, Eye, Edit, Calendar, TrendingUp, Trash2 } from "lucide-react";
import { Process, DEPARTMENTS } from "@/types/process";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EnhancedPriorityCard, PriorityBadge } from "@/components/EnhancedPriorityCard";

interface ProcessCardProps {
  process: Process;
  onView: (process: Process) => void;
  onEdit: (process: Process) => void;
  onDelete?: (process: Process) => void;
}

export const ProcessCard = ({ process, onView, onEdit, onDelete }: ProcessCardProps) => {
  const navigate = useNavigate();
  const { isAdmin, profile } = useAuth();
  console.log('ProcessCard - Auth state:', { isAdmin, profile });
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success';
      case 'draft': return 'bg-warning';
      case 'review': return 'bg-accent';
      case 'archived': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case 'comercial': return 'border-l-primary';
      case 'tecnico': return 'border-l-success';
      case 'administrativo': return 'border-l-warning';
      case 'marketing': return 'border-l-accent';
      case 'pos-venda': return 'border-l-purple-500';
      case 'suporte-online': return 'border-l-blue-500';
      default: return 'border-l-muted';
    }
  };

  return (
    <EnhancedPriorityCard priority={process.priority || 2} className="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className={`w-2 h-16 rounded-full ${getDepartmentColor(process.department).replace('border-l-', 'bg-')}`} />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg leading-tight font-semibold group-hover:text-primary transition-colors">
                {process.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {DEPARTMENTS[process.department]}
                </Badge>
                <Badge className={`${getStatusColor(process.status)} text-white text-xs`}>
                  {process.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
          {process.objective?.replace(/<[^>]*>/g, '') || 'Sem objetivo disponível'}
        </div>
        
        {/* Owner */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {process.owner.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground/90">{process.owner}</span>
        </div>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Users className="h-4 w-4 text-primary mx-auto mb-1" />
            <p className="text-xs font-medium">{process.participants.length}</p>
            <p className="text-xs text-muted-foreground">Pessoas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <Target className="h-4 w-4 text-success mx-auto mb-1" />
            <p className="text-xs font-medium">{process.activities.length}</p>
            <p className="text-xs text-muted-foreground">Etapas</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <TrendingUp className="h-4 w-4 text-warning mx-auto mb-1" />
            <p className="text-xs font-medium">{process.metrics.length}</p>
            <p className="text-xs text-muted-foreground">Métricas</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {process.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
          {process.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{process.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/processo/${process.id}`)}
            className="flex-1 hover:bg-primary/10 hover:text-primary hover:border-primary"
          >
            <Eye className="h-4 w-4 mr-1" />
            Visualizar
          </Button>
          {profile && isAdmin && (
            <>
              <Button 
                variant="default" 
                size="sm" 
                onClick={() => onEdit(process)}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow hover:from-primary/90 hover:to-primary-glow/90"
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
              {onDelete && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => onDelete(process)}
                  className="hover:bg-destructive/90"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </>
          )}
        </div>
      </CardContent>
    </EnhancedPriorityCard>
  );
};
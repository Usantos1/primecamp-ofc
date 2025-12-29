import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, Send, Phone, User, Clock, Check, CheckCheck,
  Settings, X, ArrowLeft, Loader2, MessageCircle, Image as ImageIcon
} from 'lucide-react';
import { useLeadMessages, useConversations, useAtivaCRMConfig, LeadMessage, Conversation } from '@/hooks/useLeadChat';
import { Lead } from '@/hooks/useMarketing';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface LeadChatPanelProps {
  lead?: Lead | null;
  onClose?: () => void;
  fullScreen?: boolean;
}

export function LeadChatPanel({ lead, onClose, fullScreen = false }: LeadChatPanelProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | Conversation | null>(lead || null);
  const [messageText, setMessageText] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversations, isLoading: conversationsLoading } = useConversations();
  const { messages, isLoading: messagesLoading, sendMessage, markAsRead, isSending } = useLeadMessages(selectedLead?.id || null);
  const { config, hasConfig, saveConfig, isLoading: configLoading } = useAtivaCRMConfig();

  // Scroll para o final quando novas mensagens chegam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Marcar como lidas quando selecionar um lead
  useEffect(() => {
    if (selectedLead?.id) {
      markAsRead.mutate();
    }
  }, [selectedLead?.id]);

  // Atualizar lead selecionado quando prop mudar
  useEffect(() => {
    if (lead) {
      setSelectedLead(lead);
    }
  }, [lead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedLead) return;
    
    try {
      await sendMessage.mutateAsync({ body: messageText.trim() });
      setMessageText('');
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleSaveConfig = async () => {
    if (!apiToken.trim()) return;
    await saveConfig.mutateAsync({ api_token: apiToken.trim() });
    setShowConfig(false);
    setApiToken('');
  };

  const formatMessageTime = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const isToday = msgDate.toDateString() === today.toDateString();
    
    if (isToday) {
      return format(msgDate, 'HH:mm');
    }
    return format(msgDate, 'dd/MM HH:mm');
  };

  const getStatusIcon = (status: LeadMessage['status'], direction: string) => {
    if (direction === 'inbound') return null;
    
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3 text-muted-foreground" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'failed':
        return <X className="h-3 w-3 text-red-500" />;
      default:
        return <Clock className="h-3 w-3 text-muted-foreground animate-pulse" />;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  };

  // Se não tem config do AtivaCRM, mostrar aviso
  if (!hasConfig && !configLoading) {
    return (
      <Card className={cn(fullScreen ? 'h-full' : 'h-[600px]')}>
        <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center">
          <Settings className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Configure o AtivaCRM</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Para enviar mensagens, você precisa configurar o token de API do AtivaCRM.
          </p>
          <Button onClick={() => setShowConfig(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Configurar Token
          </Button>
          
          {/* Dialog de Configuração */}
          <Dialog open={showConfig} onOpenChange={setShowConfig}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurar AtivaCRM</DialogTitle>
                <DialogDescription>
                  Insira o token de API do AtivaCRM para enviar mensagens
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Token de API *</Label>
                  <Textarea
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder="Cole seu token de API aqui..."
                    rows={3}
                    className="font-mono text-xs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Obtenha o token em: AtivaCRM → Configurações → API
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
                <Button onClick={handleSaveConfig} disabled={!apiToken.trim() || saveConfig.isPending}>
                  {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(fullScreen ? 'h-full' : 'h-[600px]', 'flex flex-col')}>
      <div className="flex h-full">
        {/* Lista de Conversas */}
        {!lead && (
          <div className={cn(
            'border-r flex flex-col',
            selectedLead ? 'hidden md:flex w-80' : 'w-full md:w-80'
          )}>
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="font-medium">Conversas</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowConfig(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhuma conversa ainda</p>
                  <p className="text-xs">As mensagens recebidas via webhook aparecerão aqui</p>
                </div>
              ) : (
                <div className="divide-y">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'p-3 cursor-pointer hover:bg-muted/50 transition-colors',
                        selectedLead?.id === conv.id && 'bg-primary/10'
                      )}
                      onClick={() => setSelectedLead(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/20 text-primary text-xs">
                            {getInitials(conv.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm truncate">{conv.nome}</span>
                            {conv.last_message_at && (
                              <span className="text-[10px] text-muted-foreground">
                                {formatMessageTime(conv.last_message_at)}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_direction === 'outbound' && '✓ '}
                            {conv.last_message || conv.telefone || conv.whatsapp}
                          </p>
                        </div>
                        {(conv.unread_count || 0) > 0 && (
                          <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                            {conv.unread_count}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        )}

        {/* Área de Chat */}
        <div className={cn(
          'flex flex-col flex-1',
          !selectedLead && !lead && 'hidden md:flex'
        )}>
          {selectedLead ? (
            <>
              {/* Header do Chat */}
              <div className="p-3 border-b flex items-center gap-3">
                {!lead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 md:hidden"
                    onClick={() => setSelectedLead(null)}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getInitials(selectedLead.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{selectedLead.nome}</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {selectedLead.whatsapp || selectedLead.telefone || 'Sem telefone'}
                  </p>
                </div>
                {onClose && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 p-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageCircle className="h-16 w-16 mb-4 opacity-50" />
                    <p className="text-sm">Nenhuma mensagem ainda</p>
                    <p className="text-xs">Envie uma mensagem para iniciar a conversa</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex',
                          msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            'max-w-[80%] rounded-2xl px-4 py-2',
                            msg.direction === 'outbound'
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-muted rounded-bl-sm'
                          )}
                        >
                          {msg.media_url && (
                            <div className="mb-2">
                              <img 
                                src={msg.media_url} 
                                alt="Mídia" 
                                className="rounded-lg max-w-full max-h-48 object-cover"
                              />
                            </div>
                          )}
                          <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                          <div className={cn(
                            'flex items-center gap-1 mt-1',
                            msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                          )}>
                            <span className={cn(
                              'text-[10px]',
                              msg.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            )}>
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {getStatusIcon(msg.status, msg.direction)}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite sua mensagem..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!messageText.trim() || isSending}
                    size="icon"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-sm">Selecione uma conversa</p>
            </div>
          )}
        </div>
      </div>

      {/* Dialog de Configuração */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar AtivaCRM</DialogTitle>
            <DialogDescription>
              Atualize o token de API do AtivaCRM
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Token de API *</Label>
              <Textarea
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Cole seu token de API aqui..."
                rows={3}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Obtenha o token em: AtivaCRM → Configurações → API
              </p>
            </div>
            {hasConfig && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  ✓ Token já configurado. Insira um novo para substituir.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancelar</Button>
            <Button onClick={handleSaveConfig} disabled={!apiToken.trim() || saveConfig.isPending}>
              {saveConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}


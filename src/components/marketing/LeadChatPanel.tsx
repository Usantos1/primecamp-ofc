import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  MessageSquare, Send, Phone, Clock, Check, CheckCheck,
  Settings, X, ArrowLeft, Loader2, MessageCircle, Search,
  MoreVertical, Smile, Paperclip, Mic
} from 'lucide-react';
import { useLeadMessages, useConversations, useAtivaCRMConfig, LeadMessage, Conversation } from '@/hooks/useLeadChat';
import { Lead } from '@/hooks/useMarketing';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
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
  const [searchTerm, setSearchTerm] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversations, isLoading: conversationsLoading, refetch: refetchConversations } = useConversations();
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
    return format(new Date(date), 'HH:mm');
  };

  const formatConversationTime = (date: string) => {
    const msgDate = new Date(date);
    if (isToday(msgDate)) {
      return format(msgDate, 'HH:mm');
    }
    if (isYesterday(msgDate)) {
      return 'Ontem';
    }
    return format(msgDate, 'dd/MM');
  };

  const formatDateDivider = (date: string) => {
    const msgDate = new Date(date);
    if (isToday(msgDate)) {
      return 'Hoje';
    }
    if (isYesterday(msgDate)) {
      return 'Ontem';
    }
    return format(msgDate, "dd 'de' MMMM", { locale: ptBR });
  };

  const getStatusIcon = (status: LeadMessage['status'], direction: string) => {
    if (direction === 'inbound') return null;
    
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
        return <CheckCheck className="h-3 w-3" />;
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-400" />;
      case 'failed':
        return <X className="h-3 w-3 text-red-400" />;
      default:
        return <Clock className="h-3 w-3 animate-pulse" />;
    }
  };

  const getInitials = (name: string) => {
    return name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  };

  // Agrupar mensagens por data
  const groupedMessages = messages.reduce((groups: { date: string; messages: LeadMessage[] }[], msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    const existingGroup = groups.find(g => g.date === date);
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      groups.push({ date, messages: [msg] });
    }
    return groups;
  }, []);

  // Filtrar conversas
  const filteredConversations = conversations.filter(conv => 
    conv.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.telefone?.includes(searchTerm) ||
    conv.whatsapp?.includes(searchTerm)
  );

  // Se não tem config do AtivaCRM, mostrar aviso
  if (!hasConfig && !configLoading) {
    return (
      <Card className={cn(fullScreen ? 'h-[calc(100vh-200px)]' : 'h-[600px]', 'overflow-hidden')}>
        <CardContent className="flex flex-col items-center justify-center h-full p-8 text-center bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <MessageSquare className="h-10 w-10 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Configure o AtivaCRM</h3>
          <p className="text-muted-foreground mb-6 max-w-md">
            Para enviar e receber mensagens pelo WhatsApp, você precisa configurar a integração com o AtivaCRM.
          </p>
          <Button onClick={() => setShowConfig(true)} className="bg-green-600 hover:bg-green-700">
            <Settings className="h-4 w-4 mr-2" />
            Configurar Integração
          </Button>
          
          <ConfigDialog 
            open={showConfig} 
            onOpenChange={setShowConfig}
            apiToken={apiToken}
            setApiToken={setApiToken}
            onSave={handleSaveConfig}
            isSaving={saveConfig.isPending}
            hasConfig={hasConfig}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(fullScreen ? 'h-[calc(100vh-200px)]' : 'h-[600px]', 'overflow-hidden border-0 shadow-lg')}>
      <div className="flex h-full bg-[#efeae2] dark:bg-[#0b141a]">
        {/* Lista de Conversas */}
        {!lead && (
          <div className={cn(
            'bg-white dark:bg-[#111b21] border-r border-[#d1d7db] dark:border-[#222d34] flex flex-col',
            selectedLead ? 'hidden md:flex w-[380px]' : 'w-full md:w-[380px]'
          )}>
            {/* Header da Lista */}
            <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-green-600 text-white">PC</AvatarFallback>
                </Avatar>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => refetchConversations()}>
                  <MessageCircle className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={() => setShowConfig(true)}>
                  <MoreVertical className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                </Button>
              </div>
            </div>

            {/* Barra de Pesquisa */}
            <div className="px-3 py-2 bg-white dark:bg-[#111b21]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#54656f] dark:text-[#aebac1]" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar ou começar uma nova conversa"
                  className="pl-10 h-9 bg-[#f0f2f5] dark:bg-[#202c33] border-0 rounded-lg text-sm"
                />
              </div>
            </div>
            
            {/* Lista de Conversas */}
            <ScrollArea className="flex-1">
              {conversationsLoading ? (
                <div className="p-8 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-green-600" />
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-[#54656f] dark:text-[#aebac1]">
                  <MessageCircle className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">Nenhuma conversa</p>
                  <p className="text-xs mt-1">As mensagens recebidas via webhook aparecerão aqui</p>
                </div>
              ) : (
                <div>
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        'flex items-center gap-3 px-3 py-3 cursor-pointer hover:bg-[#f0f2f5] dark:hover:bg-[#202c33] transition-colors border-b border-[#e9edef] dark:border-[#222d34]',
                        selectedLead?.id === conv.id && 'bg-[#f0f2f5] dark:bg-[#2a3942]'
                      )}
                      onClick={() => setSelectedLead(conv)}
                    >
                      <Avatar className="h-12 w-12 shrink-0">
                        <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6a7175] text-[#54656f] dark:text-white text-sm font-medium">
                          {getInitials(conv.nome)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-[#111b21] dark:text-[#e9edef] truncate">{conv.nome}</span>
                          {conv.last_message_at && (
                            <span className={cn(
                              'text-xs shrink-0',
                              (conv.unread_count || 0) > 0 ? 'text-green-600' : 'text-[#667781] dark:text-[#8696a0]'
                            )}>
                              {formatConversationTime(conv.last_message_at)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-sm text-[#667781] dark:text-[#8696a0] truncate">
                            {conv.last_direction === 'outbound' && (
                              <CheckCheck className="h-4 w-4 inline mr-1 text-[#53bdeb]" />
                            )}
                            {conv.last_message || conv.telefone || conv.whatsapp}
                          </p>
                          {(conv.unread_count || 0) > 0 && (
                            <Badge className="h-5 min-w-[20px] px-1.5 bg-green-600 hover:bg-green-600 text-white text-xs font-medium">
                              {conv.unread_count}
                            </Badge>
                          )}
                        </div>
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
              <div className="h-[60px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex items-center gap-3 border-b border-[#d1d7db] dark:border-[#222d34]">
                {!lead && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-full md:hidden"
                    onClick={() => setSelectedLead(null)}
                  >
                    <ArrowLeft className="h-5 w-5 text-[#54656f]" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#dfe5e7] dark:bg-[#6a7175] text-[#54656f] dark:text-white">
                    {getInitials(selectedLead.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-[#111b21] dark:text-[#e9edef] truncate">{selectedLead.nome}</h3>
                  <p className="text-xs text-[#667781] dark:text-[#8696a0] flex items-center gap-1">
                    {selectedLead.whatsapp || selectedLead.telefone || 'Sem telefone'}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <Search className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    <MoreVertical className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                  </Button>
                  {onClose && (
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={onClose}>
                      <X className="h-5 w-5 text-[#54656f] dark:text-[#aebac1]" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 px-[5%] md:px-[10%] py-4" style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z" fill="%2300000008" fill-rule="evenodd"/%3E%3C/svg%3E")',
                backgroundColor: '#efeae2'
              }}>
                {messagesLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="bg-[#ffeecd] dark:bg-[#182229] rounded-lg px-4 py-2 text-center max-w-md shadow-sm">
                      <p className="text-xs text-[#54656f] dark:text-[#8696a0]">
                        🔐 As mensagens são criptografadas de ponta a ponta. Ninguém fora desta conversa pode lê-las.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {groupedMessages.map((group) => (
                      <div key={group.date}>
                        {/* Divisor de Data */}
                        <div className="flex justify-center my-3">
                          <span className="bg-white dark:bg-[#182229] text-[#54656f] dark:text-[#8696a0] text-xs px-3 py-1 rounded-lg shadow-sm">
                            {formatDateDivider(group.messages[0].created_at)}
                          </span>
                        </div>
                        
                        {group.messages.map((msg) => (
                          <div
                            key={msg.id}
                            className={cn(
                              'flex mb-1',
                              msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                            )}
                          >
                            <div
                              className={cn(
                                'max-w-[65%] rounded-lg px-3 py-1.5 shadow-sm relative',
                                msg.direction === 'outbound'
                                  ? 'bg-[#d9fdd3] dark:bg-[#005c4b] rounded-tr-none'
                                  : 'bg-white dark:bg-[#202c33] rounded-tl-none'
                              )}
                            >
                              {msg.media_url && (
                                <div className="mb-1">
                                  <img 
                                    src={msg.media_url} 
                                    alt="Mídia" 
                                    className="rounded max-w-full max-h-64 object-cover"
                                  />
                                </div>
                              )}
                              <p className="text-sm text-[#111b21] dark:text-[#e9edef] whitespace-pre-wrap break-words pr-14">
                                {msg.body}
                              </p>
                              <div className={cn(
                                'absolute bottom-1 right-2 flex items-center gap-0.5',
                                msg.direction === 'outbound' ? 'text-[#667781]' : 'text-[#667781]'
                              )}>
                                <span className="text-[11px]">
                                  {formatMessageTime(msg.created_at)}
                                </span>
                                {msg.direction === 'outbound' && (
                                  <span className="ml-0.5">{getStatusIcon(msg.status, msg.direction)}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input de Mensagem */}
              <div className="h-[62px] bg-[#f0f2f5] dark:bg-[#202c33] px-4 flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0">
                  <Smile className="h-6 w-6 text-[#54656f] dark:text-[#aebac1]" />
                </Button>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0">
                  <Paperclip className="h-6 w-6 text-[#54656f] dark:text-[#aebac1]" />
                </Button>
                <div className="flex-1">
                  <Input
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Digite uma mensagem"
                    className="h-10 bg-white dark:bg-[#2a3942] border-0 rounded-lg text-[#111b21] dark:text-[#e9edef] placeholder:text-[#667781]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    disabled={isSending}
                  />
                </div>
                <Button 
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full shrink-0"
                  onClick={messageText.trim() ? handleSendMessage : undefined}
                  disabled={isSending}
                >
                  {isSending ? (
                    <Loader2 className="h-6 w-6 animate-spin text-[#54656f]" />
                  ) : messageText.trim() ? (
                    <Send className="h-6 w-6 text-[#54656f] dark:text-[#aebac1]" />
                  ) : (
                    <Mic className="h-6 w-6 text-[#54656f] dark:text-[#aebac1]" />
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full bg-[#f0f2f5] dark:bg-[#222e35]">
              <div className="text-center max-w-md px-8">
                <div className="w-[320px] h-[188px] mx-auto mb-6 flex items-center justify-center">
                  <MessageSquare className="h-32 w-32 text-[#d4d4d4] dark:text-[#3b4a54]" />
                </div>
                <h2 className="text-[32px] font-light text-[#41525d] dark:text-[#e9edef] mb-3">
                  PrimeCamp Chat
                </h2>
                <p className="text-sm text-[#667781] dark:text-[#8696a0]">
                  Envie e receba mensagens pelo WhatsApp diretamente do sistema.
                  <br />
                  Selecione uma conversa para começar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfigDialog 
        open={showConfig} 
        onOpenChange={setShowConfig}
        apiToken={apiToken}
        setApiToken={setApiToken}
        onSave={handleSaveConfig}
        isSaving={saveConfig.isPending}
        hasConfig={hasConfig}
      />
    </Card>
  );
}

// Componente separado para o Dialog de Configuração
function ConfigDialog({ 
  open, 
  onOpenChange, 
  apiToken, 
  setApiToken, 
  onSave, 
  isSaving, 
  hasConfig 
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiToken: string;
  setApiToken: (token: string) => void;
  onSave: () => void;
  isSaving: boolean;
  hasConfig: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-10 w-10 bg-green-600 rounded-full flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            Configurar AtivaCRM
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta do AtivaCRM para enviar mensagens pelo WhatsApp
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-sm font-medium">Token de API</Label>
            <Textarea
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Cole seu token de API aqui..."
              rows={3}
              className="mt-1.5 font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Obtenha em: <span className="font-medium">AtivaCRM → Configurações → API</span>
            </p>
          </div>
          {hasConfig && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-400 flex items-center gap-2">
                <Check className="h-4 w-4" />
                Token configurado. Insira um novo para substituir.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={onSave} 
            disabled={!apiToken.trim() || isSaving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

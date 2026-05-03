import { useEffect, useMemo, useState } from 'react';
import { useApiTokens, ApiAccessLog, ApiToken, API_PERMISSIONS } from '@/hooks/useApiTokens';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Key, 
  Plus, 
  Copy, 
  Eye, 
  EyeOff, 
  Trash2, 
  Settings, 
  Activity,
  Clock,
  Shield,
  Code,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Search,
  Zap
} from 'lucide-react';

const LOGS_PER_PAGE = 25;

function buildTokenUsageSummaryLog(token: ApiToken): ApiAccessLog {
  return {
    id: `usage-summary-${token.id}`,
    token_id: token.id,
    token_nome: token.nome,
    endpoint: 'Histórico do token',
    method: 'INFO',
    ip_address: '-',
    user_agent: 'Resumo gerado a partir do contador de uso do token',
    query_params: {
      uso_count: token.uso_count,
      ultimo_uso: token.ultimo_uso,
      observacao: 'As respostas completas passam a aparecer para novas chamadas registradas em api_access_logs.',
    },
    response_body: JSON.stringify({
      tipo: 'resumo_historico',
      token: token.nome,
      total_requisicoes: token.uso_count,
      ultimo_uso: token.ultimo_uso,
      aviso: 'Este token tem uso histórico, mas os detalhes por requisição não foram armazenados antes dos logs detalhados. Faça uma nova chamada para ver endpoint, filtros e resposta completa.',
    }),
    created_at: token.ultimo_uso || token.created_at,
    is_summary: true,
  };
}

function formatLogQuerySummary(queryParams: Record<string, unknown> | undefined) {
  if (!queryParams || Object.keys(queryParams).length === 0) return 'Sem parâmetros';

  return Object.entries(queryParams)
    .filter(([, value]) => value !== undefined && value !== null && String(value) !== '')
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ') || 'Sem parâmetros';
}

function stringifyJson(value: unknown) {
  if (value == null || value === '') return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

export function ApiManager() {
  const { 
    tokens, 
    isLoading, 
    createToken, 
    updateToken, 
    deleteToken, 
    fetchAllLogs,
    isCreating 
  } = useApiTokens();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedToken, setSelectedToken] = useState<ApiToken | null>(null);
  const [showTokenValue, setShowTokenValue] = useState<Record<string, boolean>>({});
  const [apiLogs, setApiLogs] = useState<ApiAccessLog[]>([]);
  const [apiLogsTotal, setApiLogsTotal] = useState(0);
  const [apiLogsError, setApiLogsError] = useState<string | null>(null);
  const [loadingApiLogs, setLoadingApiLogs] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ApiAccessLog | null>(null);
  const [logSearch, setLogSearch] = useState('');
  const [logTokenFilter, setLogTokenFilter] = useState('all');
  const [logStatusFilter, setLogStatusFilter] = useState('all');
  const [logPage, setLogPage] = useState(1);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);

  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    permissoes: ['produtos:read'] as string[],
    expires_at: '',
  });

  const handleCreate = async () => {
    await createToken({
      nome: formData.nome,
      descricao: formData.descricao,
      permissoes: formData.permissoes,
      expires_at: formData.expires_at || undefined,
    });
    setShowCreateDialog(false);
    setFormData({ nome: '', descricao: '', permissoes: ['produtos:read'], expires_at: '' });
  };

  const handleToggleActive = async (token: ApiToken) => {
    await updateToken({ id: token.id, data: { ativo: !token.ativo } });
  };

  const handleDelete = async () => {
    if (selectedToken) {
      await deleteToken(selectedToken.id);
      setShowDeleteDialog(false);
      setSelectedToken(null);
    }
  };

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
  };

  const handleViewLogs = (token: ApiToken) => {
    setLogTokenFilter(token.id);
    setLogPage(1);
    setSelectedLog(null);
  };

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.ativafix.com/api';
  const logOffset = (logPage - 1) * LOGS_PER_PAGE;
  const totalLogPages = Math.max(1, Math.ceil(apiLogsTotal / LOGS_PER_PAGE));
  const selectedLogToken = useMemo(
    () => tokens.find((token) => token.id === logTokenFilter) || null,
    [logTokenFilter, tokens]
  );
  const selectedLogQuery = useMemo(() => stringifyJson(selectedLog?.query_params), [selectedLog]);
  const selectedLogResponse = useMemo(() => stringifyJson(selectedLog?.response_body), [selectedLog]);

  useEffect(() => {
    let cancelled = false;

    async function loadLogs() {
      setLoadingApiLogs(true);
      const result = await fetchAllLogs({
        search: logSearch,
        token_id: logTokenFilter,
        token_ids: logTokenFilter === 'all' ? tokens.map((token) => token.id) : undefined,
        status: logStatusFilter,
        limit: LOGS_PER_PAGE,
        offset: logOffset,
      });

      if (!cancelled) {
        const shouldShowUsageSummary =
          selectedLogToken &&
          selectedLogToken.uso_count > 0 &&
          logPage === 1 &&
          !logSearch &&
          logStatusFilter === 'all' &&
          result.rows.length === 0;
        const rows = shouldShowUsageSummary ? [buildTokenUsageSummaryLog(selectedLogToken)] : result.rows;

        setApiLogs(rows);
        setApiLogsTotal(shouldShowUsageSummary ? 1 : result.total);
        setApiLogsError(shouldShowUsageSummary ? null : result.error || null);
        setSelectedLog((current) => current && rows.some((log) => log.id === current.id) ? current : null);
        setLoadingApiLogs(false);
      }
    }

    loadLogs();

    return () => {
      cancelled = true;
    };
  }, [fetchAllLogs, logOffset, logPage, logSearch, logStatusFilter, logTokenFilter, logsRefreshKey, selectedLogToken, tokens]);

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardContent className="p-4">
          <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(520px,2fr)]">
            <div className="space-y-4">
              <div className="rounded-xl border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="flex items-center gap-2 text-lg font-semibold">
                      <Key className="h-5 w-5 shrink-0" />
                      Tokens de API
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Gerencie tokens para integração com sistemas externos e agentes de IA
                    </p>
                  </div>
                  <Button size="sm" className="h-8 shrink-0 rounded-full px-3 text-xs" onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Novo Token
                  </Button>
                </div>
              </div>
      {/* Documentação Rápida */}
      <Collapsible>
        <Card className="border-blue-200 bg-blue-50/50">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-base text-blue-900">Documentação da API</CardTitle>
                </div>
                <ChevronDown className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">URL Base</h4>
                  <code className="block p-2 bg-white rounded text-xs break-all">
                    {API_BASE_URL}/v1
                  </code>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Autenticação</h4>
                  <code className="block p-2 bg-white rounded text-xs">
                    Authorization: Bearer &lt;seu_token&gt;
                  </code>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Endpoints Disponíveis</h4>
                <div className="grid gap-2 text-xs">
                  <div className="p-2 bg-white rounded flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">GET</Badge>
                    <code>/v1/produtos</code>
                    <span className="text-muted-foreground ml-auto">Buscar produtos</span>
                  </div>
                  <div className="p-2 bg-white rounded flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">GET</Badge>
                    <code>/v1/produtos/:id</code>
                    <span className="text-muted-foreground ml-auto">Buscar por ID/código</span>
                  </div>
                  <div className="p-2 bg-white rounded flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">GET</Badge>
                    <code>/v1/marcas</code>
                    <span className="text-muted-foreground ml-auto">Listar marcas</span>
                  </div>
                  <div className="p-2 bg-white rounded flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">GET</Badge>
                    <code>/v1/modelos</code>
                    <span className="text-muted-foreground ml-auto">Listar modelos</span>
                  </div>
                  <div className="p-2 bg-white rounded flex items-center gap-2">
                    <Badge variant="secondary" className="text-[10px]">GET</Badge>
                    <code>/v1/grupos</code>
                    <span className="text-muted-foreground ml-auto">Listar grupos</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Parâmetros de Busca (produtos)</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                  <code className="p-1 bg-white rounded">busca</code>
                  <code className="p-1 bg-white rounded">modelo</code>
                  <code className="p-1 bg-white rounded">marca</code>
                  <code className="p-1 bg-white rounded">grupo</code>
                  <code className="p-1 bg-white rounded">codigo</code>
                  <code className="p-1 bg-white rounded">referencia</code>
                  <code className="p-1 bg-white rounded">codigo_barras</code>
                  <code className="p-1 bg-white rounded">localizacao</code>
                  <code className="p-1 bg-white rounded">estoque_min</code>
                  <code className="p-1 bg-white rounded">estoque_max</code>
                  <code className="p-1 bg-white rounded">preco_min</code>
                  <code className="p-1 bg-white rounded">preco_max</code>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Exemplo de Uso (cURL)</h4>
                <code className="block p-2 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto">
                  curl -X GET "{API_BASE_URL}/v1/produtos?modelo=iPhone%2015" \<br />
                  &nbsp;&nbsp;-H "Authorization: Bearer SEU_TOKEN_AQUI"
                </code>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm">Exemplo para Agente de IA</h4>
                <div className="p-3 bg-white rounded text-xs space-y-2">
                  <p className="text-muted-foreground">
                    Use esta API quando o cliente perguntar sobre preços, disponibilidade ou características de produtos.
                  </p>
                  <p>
                    <strong>Pergunta:</strong> "Qual o preço da tela do iPhone 15?"
                  </p>
                  <p>
                    <strong>Requisição:</strong> <code>GET /v1/produtos?modelo=iPhone 15&busca=tela</code>
                  </p>
                </div>
              </div>

              <Button variant="outline" size="sm" asChild>
                <a href={`${API_BASE_URL}/v1/docs`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Ver Documentação Completa
                </a>
              </Button>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Lista de Tokens */}
      <div className="space-y-3">
        {isLoading ? (
          <Card className="p-6">
            <div className="flex items-center justify-center text-muted-foreground">
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Carregando tokens...
            </div>
          </Card>
        ) : tokens.length === 0 ? (
          <Card className="p-6">
            <div className="text-center text-muted-foreground">
              <Key className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum token criado ainda.</p>
              <p className="text-sm">Crie um token para começar a usar a API.</p>
            </div>
          </Card>
        ) : (
          tokens.map((token) => (
            <Card key={token.id} className={!token.ativo ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{token.nome}</h4>
                      {token.ativo ? (
                        <Badge variant="default" className="bg-green-500">Ativo</Badge>
                      ) : (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    
                    {token.descricao && (
                      <p className="text-sm text-muted-foreground">{token.descricao}</p>
                    )}

                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {showTokenValue[token.id] ? token.token : `${token.token.substring(0, 12)}...`}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setShowTokenValue(prev => ({ ...prev, [token.id]: !prev[token.id] }))}
                      >
                        {showTokenValue[token.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => handleCopyToken(token.token)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {(token.permissoes || []).map((perm) => (
                        <Badge key={perm} variant="outline" className="text-[10px]">
                          <Shield className="h-2.5 w-2.5 mr-1" />
                          {perm}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Activity className="h-3 w-3" />
                        {token.uso_count} requisições
                      </span>
                      {token.ultimo_uso && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Último uso: {formatDistanceToNow(new Date(token.ultimo_uso), { addSuffix: true, locale: ptBR })}
                        </span>
                      )}
                      {token.expires_at && (
                        <span className="flex items-center gap-1">
                          Expira: {format(new Date(token.expires_at), 'dd/MM/yyyy')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Switch
                      checked={token.ativo}
                      onCheckedChange={() => handleToggleActive(token)}
                      aria-label={token.ativo ? 'Desativar token' : 'Ativar token'}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewLogs(token)}
                    >
                      <Activity className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => { setSelectedToken(token); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
        </div>

        <Card className="flex min-h-[580px] max-h-[calc(100dvh-13rem)] flex-col overflow-hidden xl:h-[calc(100dvh-13rem)] xl:self-start">
          <CardHeader className="shrink-0 space-y-2 border-b p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Activity className="h-4 w-4" />
                  Logs da API
                </CardTitle>
                <CardDescription className="text-xs">
                  Consulte chamadas, filtros usados e a resposta completa.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  setSelectedLog(null);
                  setLogPage(1);
                  setLogsRefreshKey((value) => value + 1);
                }}
                disabled={loadingApiLogs}
              >
                <RefreshCw className={`h-4 w-4 ${loadingApiLogs ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="h-9 pl-9 text-xs"
                placeholder="Buscar endpoint, token, resposta..."
                value={logSearch}
                onChange={(event) => {
                  setLogSearch(event.target.value);
                  setLogPage(1);
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={logTokenFilter}
                onChange={(event) => {
                  setLogTokenFilter(event.target.value);
                  setLogPage(1);
                  setSelectedLog(null);
                }}
              >
                <option value="all">Todos os tokens</option>
                {tokens.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.nome}
                  </option>
                ))}
              </select>

              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                value={logStatusFilter}
                onChange={(event) => {
                  setLogStatusFilter(event.target.value);
                  setLogPage(1);
                  setSelectedLog(null);
                }}
              >
                <option value="all">Todos os status</option>
                <option value="success">Sucesso 2xx</option>
                <option value="error">Erros 4xx/5xx</option>
                <option value="200">Status 200</option>
                <option value="404">Status 404</option>
                <option value="500">Status 500</option>
              </select>
            </div>
          </CardHeader>

          <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 py-3">
              {loadingApiLogs ? (
                <div className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Carregando logs...
                </div>
              ) : apiLogsError ? (
                <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-10 text-center text-sm text-destructive">
                  <p>Erro ao carregar logs da API.</p>
                  <p className="mx-auto max-w-[320px] text-xs text-muted-foreground">
                    {apiLogsError}
                  </p>
                </div>
              ) : apiLogs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center space-y-3 py-10 text-center text-sm text-muted-foreground">
                  <p>Nenhum log encontrado.</p>
                  <p className="mx-auto max-w-[320px] text-xs">
                    Os logs aparecem quando integrações ou agentes fazem chamadas reais usando um token da API.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-full min-h-0 flex-1 pr-2">
                  <div className="space-y-2">
                    {apiLogs.map((log) => {
                      const isError = (log.response_status || 0) >= 400;
                      const querySummary = formatLogQuerySummary(log.query_params);

                      return (
                        <button
                          key={log.id}
                          type="button"
                          className={`w-full rounded-xl border p-3 text-left transition hover:bg-muted/70 ${
                            selectedLog?.id === log.id ? 'border-primary bg-primary/5' : 'bg-background'
                          }`}
                          onClick={() => setSelectedLog(log)}
                        >
                          <div className="flex w-full items-start justify-between gap-2">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex min-w-0 items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {log.method}
                                </Badge>
                                {log.is_summary && (
                                  <Badge variant="secondary" className="text-xs">
                                    Resumo
                                  </Badge>
                                )}
                                <code className="truncate text-xs">{log.endpoint}</code>
                              </div>
                              <p className="truncate text-xs text-muted-foreground">
                                {querySummary}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="truncate">{log.token_nome || 'Token'}</span>
                                <span>{format(new Date(log.created_at), 'dd/MM HH:mm')}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {log.response_status && (
                                <Badge variant={isError ? 'destructive' : 'secondary'} className="text-xs">
                                  {log.response_status}
                                </Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}

              <div className="mt-2 flex shrink-0 items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
                <span>
                  {apiLogsTotal} registros
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPage((page) => Math.max(1, page - 1))}
                    disabled={logPage <= 1 || loadingApiLogs}
                  >
                    Anterior
                  </Button>
                  <span>
                    {logPage}/{totalLogPages}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLogPage((page) => Math.min(totalLogPages, page + 1))}
                    disabled={logPage >= totalLogPages || loadingApiLogs}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
          </div>
        </CardContent>
      </Card>

      <Dialog open={selectedLog !== null} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-h-[92dvh] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Detalhes da requisição
            </DialogTitle>
            <DialogDescription className="break-all">
              {selectedLog ? `${selectedLog.method} ${selectedLog.endpoint} · ${format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss')}` : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="grid max-h-[calc(92dvh-92px)] gap-0 overflow-hidden lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.7fr)]">
              <div className="space-y-4 overflow-y-auto border-r p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{selectedLog.method}</Badge>
                  {selectedLog.response_status && (
                    <Badge variant={(selectedLog.response_status || 0) >= 400 ? 'destructive' : 'secondary'}>
                      {selectedLog.response_status}
                    </Badge>
                  )}
                  {selectedLog.is_summary && <Badge variant="secondary">Histórico</Badge>}
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Endpoint</p>
                  <code className="block break-all rounded-md bg-muted p-2 text-xs">{selectedLog.endpoint}</code>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Token</p>
                  <p className="text-sm">{selectedLog.token_nome || 'Token'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Origem</p>
                  <p className="break-all text-xs text-muted-foreground">
                    {selectedLog.ip_address} · {selectedLog.user_agent || 'Sem user agent'}
                  </p>
                </div>

                {selectedLog.is_summary && (
                  <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    Este item resume o contador antigo do token. Logs com endpoint, filtros e resposta completa aparecem para novas chamadas da API.
                  </p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-medium text-muted-foreground">Query params</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigator.clipboard.writeText(selectedLogQuery || '{}')}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <pre className="max-h-[280px] overflow-auto rounded-md bg-muted p-3 text-xs whitespace-pre-wrap break-all">
                    {selectedLogQuery || '{}'}
                  </pre>
                </div>
              </div>

              <div className="flex min-h-0 flex-col p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    Resposta completa {selectedLog.response_status ? `(${selectedLog.response_status})` : ''}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigator.clipboard.writeText(selectedLogResponse || '')}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    Copiar JSON
                  </Button>
                </div>
                <pre className="min-h-[520px] flex-1 overflow-auto rounded-md bg-slate-950 p-4 text-xs text-slate-100 whitespace-pre-wrap break-all">
                  {selectedLogResponse || 'Sem corpo de resposta salvo.'}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Criar Token */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Criar Token de API
            </DialogTitle>
            <DialogDescription>
              Crie um novo token para acessar a API externamente
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome do Token *</Label>
              <Input
                id="nome"
                placeholder="Ex: Agente IA WhatsApp"
                value={formData.nome}
                onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva o uso deste token"
                value={formData.descricao}
                onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="space-y-2">
                {API_PERMISSIONS.map((perm) => (
                  <div key={perm.value} className="flex items-start gap-2">
                    <Checkbox
                      id={perm.value}
                      checked={formData.permissoes.includes(perm.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData(prev => ({ ...prev, permissoes: [...prev.permissoes, perm.value] }));
                        } else {
                          setFormData(prev => ({ ...prev, permissoes: prev.permissoes.filter(p => p !== perm.value) }));
                        }
                      }}
                    />
                    <div className="grid gap-0.5 leading-none">
                      <label htmlFor={perm.value} className="text-sm font-medium cursor-pointer">
                        {perm.label}
                      </label>
                      <p className="text-xs text-muted-foreground">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires_at">Data de Expiração (opcional)</Label>
              <Input
                id="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData(prev => ({ ...prev, expires_at: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para criar um token sem expiração
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={!formData.nome || isCreating}>
              <Zap className="h-4 w-4 mr-2" />
              Criar Token
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Excluir Token */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Token</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o token <strong>"{selectedToken?.nome}"</strong>?
              <br /><br />
              Esta ação é irreversível e todas as integrações que usam este token deixarão de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


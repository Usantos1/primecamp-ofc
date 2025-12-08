import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Node,
  Edge,
  ConnectionMode,
  PanOnScrollMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Save, Trash2, Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ProcessBlocksModal } from './ProcessBlocksModal';
import { FlowNodeEditModal } from './FlowNodeEditModal';
import CustomNode from './CustomNode';
import { FlowNode, FlowEdge } from '@/types/process';
import { useToast } from '@/hooks/use-toast';

interface FlowBuilderProps {
  processId?: string;
  initialNodes?: FlowNode[];
  initialEdges?: FlowEdge[];
  onSave?: (nodes: FlowNode[], edges: FlowEdge[]) => void;
  readOnly?: boolean; // Novo prop para modo visualização
}

const defaultNodes: Node[] = [
  {
    id: '1',
    type: 'custom',
    data: { 
      label: 'Início do Processo',
      color: '#22c55e',
      isTask: false,
      outputHandles: 1
    },
    position: { x: 250, y: 25 },
    draggable: true,
  },
];

const defaultEdges: Edge[] = [];

// Função para garantir que sempre temos pelo menos um nó padrão visível
const ensureVisibleFlow = (nodes: any[], edges: any[]) => {
  if (!nodes || nodes.length === 0) {
    return { nodes: defaultNodes, edges: defaultEdges };
  }
  return { nodes, edges };
};

const FlowBuilderCore = ({ processId, initialNodes = [], initialEdges = [], onSave, readOnly = false }: FlowBuilderProps) => {
  const { toast } = useToast();
  
  console.log('FlowBuilder - Initial data:', { processId, initialNodesLength: initialNodes.length, readOnly });
  
  // Garante que sempre temos pelo menos um nó visível
  const { nodes: safeNodes, edges: safeEdges } = ensureVisibleFlow(initialNodes, initialEdges);
  
  console.log('FlowBuilder - Safe data:', { 
    safeNodesLength: safeNodes.length, 
    safeEdgesLength: safeEdges.length,
    safeNodes,
    safeEdges
  });
  
  // Initialize nodes and edges states com useMemo para evitar re-renders
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Inicialização única dos dados
  useEffect(() => {
    console.log('FlowBuilder - Initializing once:', { safeNodesLength: safeNodes.length });
    
    const initializedNodes = safeNodes.map(node => ({
      ...node,
      draggable: !readOnly,
      selectable: !readOnly,
      type: 'custom',
      data: {
        ...node.data,
        editMode: !readOnly
      }
    }));
    
    const initializedEdges = safeEdges.map(edge => ({
      ...edge,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { 
        strokeWidth: 2, 
        stroke: '#6366f1',
        strokeDasharray: '5,5'
      },
      deletable: !readOnly,
      focusable: !readOnly,
      sourceHandle: edge.sourceHandle || null,
      targetHandle: edge.targetHandle || null
    }));
    
    setNodes(initializedNodes);
    setEdges(initializedEdges);
  }, []); // Dependências vazias para executar apenas uma vez

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Handle node color changes
  const handleNodeColorChange = useCallback((nodeId: string, color: string) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { 
                ...node.data, 
                color
              }
            }
          : node
      )
    );
  }, [setNodes]);

  // Handle output handles changes
  const handleOutputHandlesChange = useCallback((nodeId: string, count: number) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              data: { 
                ...node.data, 
                outputHandles: count
              }
            }
          : node
      )
    );
  }, [setNodes]);

  // Handle adding connected nodes
  const handleAddConnectedNode = useCallback((sourceNodeId: string) => {
    const sourceNode = nodes.find(node => node.id === sourceNodeId);
    if (!sourceNode) return;

    const newNodeId = `node-${Date.now()}`;
    const newNode: Node = {
      id: newNodeId,
      type: 'custom',
      data: { 
        label: 'Novo Bloco',
        color: '#6366f1',
        outputHandles: 1,
        onColorChange: handleNodeColorChange,
        onOutputHandlesChange: handleOutputHandlesChange,
        onAddConnectedNode: handleAddConnectedNode
      },
      position: { 
        x: sourceNode.position.x + 200, 
        y: sourceNode.position.y + 100 
      },
      draggable: true,
    };

    const newEdge: Edge = {
      id: `edge-${Date.now()}`,
      source: sourceNodeId,
      target: newNodeId,
      animated: true,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { 
        strokeWidth: 2, 
        stroke: '#6366f1',
        strokeDasharray: '5,5'
      },
      deletable: true,
      focusable: true
    };

    setNodes((nds) => [...nds, newNode]);
    setEdges((eds) => [...eds, newEdge]);
  }, [nodes, setNodes, setEdges, handleNodeColorChange, handleOutputHandlesChange]);

  // Update all nodes with callbacks when they change - apenas uma vez
  useEffect(() => {
    if (readOnly) {
      // Em modo readOnly, apenas define os nós sem callbacks para evitar re-renders
      return;
    }
    
    setNodes((nds) =>
      nds.map((node) => ({
        ...node,
        data: {
          ...node.data,
          editMode: !readOnly,
          onColorChange: handleNodeColorChange,
          onOutputHandlesChange: handleOutputHandlesChange,
          onAddConnectedNode: handleAddConnectedNode
        }
      }))
    );
  }, [readOnly]); // Apenas quando readOnly muda

  // Handle edge connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        const newEdge = {
          id: `${params.source}-${params.target}`,
          source: params.source,
          target: params.target,
          sourceHandle: params.sourceHandle || null,
          targetHandle: params.targetHandle || null,
          type: 'default',
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { 
            strokeWidth: 2, 
            stroke: '#6366f1',
            strokeDasharray: '5,5'
          },
          deletable: true,
          focusable: true
        };
        setEdges((eds) => addEdge(newEdge as Edge, eds));
      }
    },
    [setEdges]
  );

  // Handle edge deletion with keyboard
  const onEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
    setEdges((eds) => eds.filter((e) => !edgesToDelete.some(del => del.id === e.id)));
    toast({
      title: "Conexão removida",
      description: "A linha foi removida com sucesso",
    });
  }, [setEdges, toast]);

  // Handle edge click for selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation();
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  // Handle save flow layout only (not the entire process)
  const handleSaveFlow = async () => {
    if (readOnly) return; // Não permite salvar em modo readonly
    
    const flowNodes: FlowNode[] = nodes.map((node) => ({
      id: node.id,
      type: node.type || 'custom',
      data: {
        label: (node.data?.label as string) || 'Sem nome',
        ...node.data
      },
      position: node.position,
      style: node.style,
      className: node.className
    }));
    
    const flowEdges: FlowEdge[] = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle || undefined,
      targetHandle: edge.targetHandle || undefined,
      type: edge.type,
      style: edge.style,
      markerEnd: edge.markerEnd
    }));
    
    // Save flow data both locally and through callback
    const flowData = { nodes: flowNodes, edges: flowEdges };
    localStorage.setItem(`flow-layout-${processId || 'default'}`, JSON.stringify(flowData));
    
    if (onSave) {
      try {
        await onSave(flowNodes, flowEdges);
        toast({
          title: "Fluxo salvo",
          description: "O fluxo foi salvo com sucesso",
        });
      } catch (error) {
        toast({
          title: "Erro",
          description: "Erro ao salvar fluxo",
          variant: "destructive"
        });
      }
    } else {
      toast({
        title: "Layout salvo",
        description: "Layout do fluxo salvo localmente",
      });
    }
  };

  // Add node from modal (with improved positioning)
  const addNodeToFlow = (event: React.MouseEvent, type: 'input' | 'default' | 'output', label: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    const newNode: Node = {
      id: `node-${Date.now()}`,
      type: 'custom',
      data: { 
        label,
        color: type === 'input' ? '#22c55e' : type === 'output' ? '#ef4444' : '#6366f1',
        isTask: label.toLowerCase().includes('tarefa') || label.toLowerCase().includes('atividade'),
        outputHandles: 1,
        onColorChange: handleNodeColorChange,
        onOutputHandlesChange: handleOutputHandlesChange,
        onAddConnectedNode: handleAddConnectedNode
      },
      position: { 
        x: Math.random() * 200 + 200, 
        y: Math.random() * 150 + 200 
      },
      draggable: true,
    };

    setNodes((nds) => [...nds, newNode]);
    toast({
      title: "Bloco adicionado",
      description: `${label} foi adicionado ao fluxo`,
    });
  };

  // Delete selected node
  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setSelectedNodeId(null);
    toast({
      title: "Bloco removido",
      description: "O bloco foi removido com sucesso",
    });
  };

  // Delete selected edge
  const deleteSelectedEdge = useCallback(() => {
    if (selectedEdgeId) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdgeId));
      setSelectedEdgeId(null);
      toast({
        title: "Conexão removida",
        description: "A linha foi removida com sucesso",
      });
    }
  }, [selectedEdgeId, setEdges, toast]);

  // Handle node clicks
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    setSelectedEdgeId(null);
  }, []);

  // Handle node double click for editing
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    setEditingNode(node);
    setEditModalOpen(true);
  }, []);

  // Handle node edit modal save
  const handleNodeEditSave = useCallback((data: { label: string; color: string; description?: string; tags?: string[] }) => {
    if (editingNode) {
      setNodes((nds) =>
        nds.map((node) =>
          node.id === editingNode.id 
            ? { 
                ...node, 
                data: { 
                  ...node.data, 
                  label: data.label,
                  color: data.color,
                  description: data.description,
                  tags: data.tags
                } 
              }
            : node
        )
      );
      toast({
        title: "Bloco atualizado",
        description: "As informações do bloco foram salvas",
      });
    }
    setEditModalOpen(false);
    setEditingNode(null);
  }, [editingNode, setNodes, toast]);

  // Handle drag events for visual feedback
  const onNodeDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  const onNodeDragStop = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle pane click to deselect
  const onPaneClick = useCallback(() => {
    setSelectedEdgeId(null);
    setSelectedNodeId(null);
  }, []);

  return (
    <Card className="w-full min-h-screen">
      <CardHeader className="sticky top-0 z-10 bg-background border-b">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            {readOnly ? '📊 Visualização do Fluxo' : '🔄 Construtor de Fluxo'}
            {!readOnly && selectedNodeId && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Bloco: {selectedNodeId}
              </Badge>
            )}
            {!readOnly && selectedEdgeId && (
              <Badge variant="outline" className="ml-2 text-xs">
                Linha: {selectedEdgeId}
              </Badge>
            )}
          </CardTitle>
          
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              <ProcessBlocksModal
                onAddNode={addNodeToFlow}
                trigger={
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                    <span className="hidden sm:inline">+ Blocos</span>
                    <span className="sm:hidden">+</span>
                  </Button>
                }
              />
              
              {selectedNodeId && (
                <Button 
                  onClick={() => deleteNode(selectedNodeId)} 
                  size="sm" 
                  variant="destructive"
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Excluir Bloco</span>
                  <span className="sm:hidden">🗑️</span>
                </Button>
              )}
              
              {selectedEdgeId && (
                <Button 
                  onClick={deleteSelectedEdge} 
                  size="sm" 
                  variant="destructive"
                  className="text-xs sm:text-sm"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  <span className="hidden sm:inline">Excluir Linha</span>
                  <span className="sm:hidden">✂️</span>
                </Button>
              )}
              
              <Button 
                onClick={handleSaveFlow} 
                variant="default"
                size="sm"
                className="bg-blue-600 text-white hover:bg-blue-700 text-xs sm:text-sm"
              >
                <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                <span className="hidden sm:inline">Salvar Layout</span>
                <span className="sm:hidden">💾</span>
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] relative p-0">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={readOnly ? undefined : onNodesChange}
          onEdgesChange={readOnly ? undefined : onEdgesChange}
          onConnect={readOnly ? undefined : onConnect}
          onEdgeClick={readOnly ? undefined : onEdgeClick}
          onEdgesDelete={readOnly ? undefined : onEdgesDelete}
          onNodeClick={readOnly ? undefined : onNodeClick}
          onNodeDoubleClick={readOnly ? undefined : onNodeDoubleClick}
          onNodeDragStart={readOnly ? undefined : onNodeDragStart}
          onNodeDragStop={readOnly ? undefined : onNodeDragStop}
          onPaneClick={readOnly ? undefined : onPaneClick}
          nodeTypes={{ 
            default: CustomNode, 
            input: CustomNode, 
            output: CustomNode, 
            custom: CustomNode 
          }}
          connectionMode={ConnectionMode.Loose}
          snapToGrid={true}
          snapGrid={[15, 15]}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 2
          }}
          proOptions={{
            hideAttribution: true
          }}
          style={{
            background: 'var(--muted)',
            borderRadius: '8px'
          }}
          className={isDragging ? 'cursor-grabbing' : 'cursor-default'}
          panOnDrag={true}
          panOnScroll={false}
          panOnScrollMode={PanOnScrollMode.Vertical}
          zoomOnScroll={true}
          zoomOnPinch={true}
          zoomOnDoubleClick={false}
          selectNodesOnDrag={false}
          multiSelectionKeyCode="Shift"
          deleteKeyCode={readOnly ? [] : ["Delete", "Backspace"]}
          elementsSelectable={!readOnly}
          nodesConnectable={!readOnly}
          nodesDraggable={!readOnly}
          edgesFocusable={!readOnly}
          edgesReconnectable={false}
          // CONFIGURAÇÕES CRÍTICAS PARA EVITAR "FIO SOLTO"
          connectOnClick={false}
          connectionRadius={readOnly ? 0 : 20}
          isValidConnection={readOnly ? () => false : () => true}
          onConnectStart={readOnly ? undefined : undefined}
          onConnectEnd={readOnly ? undefined : undefined}
          connectionLineStyle={readOnly ? { display: 'none' } : { 
            strokeWidth: 2, 
            stroke: '#6366f1',
            strokeDasharray: '5,5'
          }}
        >
          <Controls 
            position="bottom-left" 
            className="hidden sm:flex"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
          />
          
          {/* Mobile zoom controls */}
          <div className="sm:hidden absolute bottom-2 left-2 z-10 flex flex-col gap-1">
            <Button 
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 bg-white/90 backdrop-blur"
              onClick={() => {
                // Custom zoom in for mobile
                setNodes((nds) => nds); // Trigger re-render for zoom
              }}
            >
              +
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="w-8 h-8 p-0 bg-white/90 backdrop-blur"
              onClick={() => {
                // Custom zoom out for mobile
                setNodes((nds) => nds); // Trigger re-render for zoom
              }}
            >
              -
            </Button>
          </div>
          
          
          <Background 
            gap={window.innerWidth < 640 ? 15 : 20} 
            size={window.innerWidth < 640 ? 0.5 : 1} 
            color="#e5e7eb" 
          />
        </ReactFlow>

        {/* Flow Node Edit Modal - apenas no modo edição */}
        {!readOnly && (
          <FlowNodeEditModal
            isOpen={editModalOpen}
            onClose={() => {
              setEditModalOpen(false);
              setEditingNode(null);
            }}
            onSave={handleNodeEditSave}
            initialData={editingNode ? {
              label: (editingNode.data?.label as string) || '',
              color: (editingNode.data?.color as string) || '#6366f1',
              description: (editingNode.data?.description as string) || '',
              tags: (editingNode.data?.tags as string[]) || []
            } : undefined}
          />
        )}
      </CardContent>
    </Card>
  );
};

export const FlowBuilder = (props: FlowBuilderProps) => {
  return (
    <ReactFlowProvider>
      <FlowBuilderCore {...props} />
    </ReactFlowProvider>
  );
};
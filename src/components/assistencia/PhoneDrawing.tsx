import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface PhoneArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

const PHONE_AREAS: PhoneArea[] = [
  { id: 'tela_superior', name: 'Tela Superior', x: 15, y: 15, width: 70, height: 25 },
  { id: 'tela_central', name: 'Tela Central', x: 15, y: 42, width: 70, height: 30 },
  { id: 'tela_inferior', name: 'Tela Inferior', x: 15, y: 74, width: 70, height: 20 },
  { id: 'camera_frontal', name: 'Câmera Frontal', x: 40, y: 5, width: 20, height: 8 },
  { id: 'borda_esquerda', name: 'Borda Esquerda', x: 0, y: 20, width: 12, height: 60 },
  { id: 'borda_direita', name: 'Borda Direita', x: 88, y: 20, width: 12, height: 60 },
  { id: 'borda_superior', name: 'Borda Superior', x: 15, y: 0, width: 70, height: 12 },
  { id: 'borda_inferior', name: 'Borda Inferior', x: 15, y: 88, width: 70, height: 12 },
  { id: 'traseira', name: 'Tampa Traseira', x: 30, y: 45, width: 40, height: 15 },
];

interface PhoneDrawingProps {
  areas: string[];
  onAreasChange: (areas: string[]) => void;
  readOnly?: boolean;
}

export function PhoneDrawing({ areas, onAreasChange, readOnly = false }: PhoneDrawingProps) {
  const [hoveredArea, setHoveredArea] = useState<string | null>(null);

  const toggleArea = useCallback((areaId: string) => {
    if (readOnly) return;
    
    if (areas.includes(areaId)) {
      onAreasChange(areas.filter(a => a !== areaId));
    } else {
      onAreasChange([...areas, areaId]);
    }
  }, [areas, onAreasChange, readOnly]);

  return (
    <div className="relative">
      {/* SVG do celular */}
      <svg 
        viewBox="0 0 100 100" 
        className="w-48 h-72 mx-auto"
        style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1))' }}
      >
        {/* Corpo do celular */}
        <rect 
          x="10" 
          y="2" 
          width="80" 
          height="96" 
          rx="8" 
          ry="8" 
          fill="#1f2937" 
          stroke="#374151" 
          strokeWidth="1"
        />
        
        {/* Tela */}
        <rect 
          x="14" 
          y="8" 
          width="72" 
          height="84" 
          rx="4" 
          ry="4" 
          fill="#111827"
        />
        
        {/* Notch/Ilha dinâmica */}
        <rect 
          x="35" 
          y="10" 
          width="30" 
          height="6" 
          rx="3" 
          ry="3" 
          fill="#1f2937"
        />
        
        {/* Câmera frontal */}
        <circle cx="45" cy="13" r="2" fill="#374151" />
        
        {/* Alto-falante */}
        <rect x="48" y="12" width="10" height="2" rx="1" fill="#374151" />
        
        {/* Botão lateral (volume) */}
        <rect x="5" y="25" width="3" height="12" rx="1" fill="#374151" />
        <rect x="5" y="40" width="3" height="12" rx="1" fill="#374151" />
        
        {/* Botão lateral (power) */}
        <rect x="92" y="30" width="3" height="15" rx="1" fill="#374151" />
        
        {/* Áreas clicáveis */}
        {PHONE_AREAS.map(area => {
          const isSelected = areas.includes(area.id);
          const isHovered = hoveredArea === area.id;
          
          return (
            <rect
              key={area.id}
              x={area.x}
              y={area.y}
              width={area.width}
              height={area.height}
              rx="2"
              className={cn(
                'cursor-pointer transition-all duration-200',
                isSelected 
                  ? 'fill-red-500/60 stroke-red-400' 
                  : isHovered 
                    ? 'fill-blue-500/30 stroke-blue-400'
                    : 'fill-transparent stroke-transparent'
              )}
              strokeWidth={isSelected || isHovered ? '1' : '0'}
              onClick={() => toggleArea(area.id)}
              onMouseEnter={() => setHoveredArea(area.id)}
              onMouseLeave={() => setHoveredArea(null)}
            />
          );
        })}
        
        {/* X marks para áreas selecionadas */}
        {areas.map(areaId => {
          const area = PHONE_AREAS.find(a => a.id === areaId);
          if (!area) return null;
          
          const centerX = area.x + area.width / 2;
          const centerY = area.y + area.height / 2;
          const size = Math.min(area.width, area.height) * 0.3;
          
          return (
            <g key={`x-${areaId}`}>
              <line
                x1={centerX - size}
                y1={centerY - size}
                x2={centerX + size}
                y2={centerY + size}
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <line
                x1={centerX + size}
                y1={centerY - size}
                x2={centerX - size}
                y2={centerY + size}
                stroke="#ef4444"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </g>
          );
        })}
      </svg>
      
      {/* Tooltip */}
      {hoveredArea && !readOnly && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full bg-background border rounded px-2 py-1 text-xs shadow-lg whitespace-nowrap">
          {PHONE_AREAS.find(a => a.id === hoveredArea)?.name}
        </div>
      )}
    </div>
  );
}

export function PhoneDrawingLegend() {
  return (
    <div className="mt-4 text-center">
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-red-500/60 border border-red-400 rounded" />
          <span>Com defeito</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 bg-blue-500/30 border border-blue-400 rounded" />
          <span>Hover</span>
        </div>
      </div>
    </div>
  );
}

export default PhoneDrawing;


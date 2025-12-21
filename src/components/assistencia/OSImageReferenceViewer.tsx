import { useState, useRef, useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DefectPoint {
  id: string;
  x: number; // Posição X em % da imagem
  y: number; // Posição Y em % da imagem
}

interface OSImageReferenceViewerProps {
  imageUrl: string | null;
  defects: string[]; // Array de strings no formato "x-y" ou similar
  onDefectsChange: (defects: string[]) => void;
  readOnly?: boolean;
}

export function OSImageReferenceViewer({ 
  imageUrl, 
  defects, 
  onDefectsChange,
  readOnly = false 
}: OSImageReferenceViewerProps) {
  const [defectPoints, setDefectPoints] = useState<DefectPoint[]>([]);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Converter defects (strings) para DefectPoint[]
  useEffect(() => {
    if (defects.length > 0) {
      const points: DefectPoint[] = defects
        .map((defect, index) => {
          const parts = defect.split('-');
          if (parts.length >= 2) {
            return {
              id: `defect-${index}`,
              x: parseFloat(parts[0]) || 0,
              y: parseFloat(parts[1]) || 0,
            };
          }
          return null;
        })
        .filter((d): d is DefectPoint => d !== null);
      setDefectPoints(points);
    } else {
      setDefectPoints([]);
    }
  }, [defects]);

  // Converter DefectPoint[] para strings
  const saveDefects = useCallback((points: DefectPoint[]) => {
    const defectStrings = points.map(p => `${p.x.toFixed(1)}-${p.y.toFixed(1)}`);
    onDefectsChange(defectStrings);
  }, [onDefectsChange]);

  const handleImageClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (readOnly || !imageRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const img = imageRef.current;
    const imgRect = img.getBoundingClientRect();

    // Calcular posição relativa à imagem (não ao container)
    const x = ((event.clientX - imgRect.left) / imgRect.width) * 100;
    const y = ((event.clientY - imgRect.top) / imgRect.height) * 100;

    // Verificar se clicou dentro da imagem
    if (x < 0 || x > 100 || y < 0 || y > 100) return;

    // Verificar se já existe um defeito próximo (dentro de 3%)
    const existingDefect = defectPoints.find(
      d => Math.abs(d.x - x) < 3 && Math.abs(d.y - y) < 3
    );

    if (existingDefect) {
      // Remover defeito existente
      const newPoints = defectPoints.filter(d => d.id !== existingDefect.id);
      setDefectPoints(newPoints);
      saveDefects(newPoints);
    } else {
      // Adicionar novo defeito
      const newDefect: DefectPoint = {
        id: `defect-${Date.now()}-${Math.random()}`,
        x,
        y,
      };
      const newPoints = [...defectPoints, newDefect];
      setDefectPoints(newPoints);
      saveDefects(newPoints);
    }
  }, [defectPoints, readOnly, saveDefects]);

  if (!imageUrl) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
        <X className="h-8 w-8 mb-2 opacity-50" />
        <p className="text-xs">Nenhuma imagem de referência configurada</p>
        <p className="text-xs mt-1">Configure em: Config. Status OS</p>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full flex items-center justify-center",
        !readOnly && "cursor-crosshair"
      )}
      onClick={handleImageClick}
    >
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Referência visual do aparelho (frente e verso)"
        className="max-w-full max-h-full w-auto h-auto object-contain select-none"
        style={{ maxWidth: '100%', maxHeight: '100%' }}
        draggable={false}
      />
      
      {/* Marcações X nos defeitos */}
      {defectPoints.map(defect => {
        const xPos = `${defect.x}%`;
        const yPos = `${defect.y}%`;
        
        return (
          <div
            key={defect.id}
            className="absolute pointer-events-none"
            style={{
              left: xPos,
              top: yPos,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Sombra do X */}
            <div className="absolute inset-0 flex items-center justify-center">
              <X className="h-6 w-6 text-black opacity-50" strokeWidth={4} />
            </div>
            {/* X vermelho brilhante */}
            <X 
              className="h-5 w-5 text-red-600 relative z-10" 
              strokeWidth={3}
            />
          </div>
        );
      })}
      
      {/* Nenhum elemento sobre a imagem - área totalmente livre para marcação */}
    </div>
  );
}


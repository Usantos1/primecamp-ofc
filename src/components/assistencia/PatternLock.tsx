import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface PatternLockProps {
  value?: string;
  onChange?: (pattern: string) => void;
  disabled?: boolean;
  className?: string;
}

// Grid 3x3 de pontos
const GRID_SIZE = 3;
const DOT_SIZE = 20;
const DOT_SPACING = 50;

export function PatternLock({ value = '', onChange, disabled = false, className }: PatternLockProps) {
  const [selectedDots, setSelectedDots] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [clickStartPos, setClickStartPos] = useState<{x: number, y: number} | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Converter string de padrão para array de índices
  useEffect(() => {
    if (value) {
      const indices = value.split('-').map(Number).filter(n => !isNaN(n));
      setSelectedDots(indices);
    } else {
      setSelectedDots([]);
    }
  }, [value]);

  // Desenhar o padrão no canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Limpar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Desenhar linhas conectando os pontos
    if (selectedDots.length > 1) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      for (let i = 0; i < selectedDots.length - 1; i++) {
        const from = selectedDots[i];
        const to = selectedDots[i + 1];
        
        const fromRow = Math.floor(from / GRID_SIZE);
        const fromCol = from % GRID_SIZE;
        const toRow = Math.floor(to / GRID_SIZE);
        const toCol = to % GRID_SIZE;

        const fromX = fromCol * DOT_SPACING + DOT_SIZE / 2;
        const fromY = fromRow * DOT_SPACING + DOT_SIZE / 2;
        const toX = toCol * DOT_SPACING + DOT_SIZE / 2;
        const toY = toRow * DOT_SPACING + DOT_SIZE / 2;

        ctx.beginPath();
        ctx.moveTo(fromX, fromY);
        ctx.lineTo(toX, toY);
        ctx.stroke();
      }
    }

    // Desenhar pontos
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const index = row * GRID_SIZE + col;
        const x = col * DOT_SPACING + DOT_SIZE / 2;
        const y = row * DOT_SPACING + DOT_SIZE / 2;
        const isSelected = selectedDots.includes(index);

        // Círculo externo
        ctx.beginPath();
        ctx.arc(x, y, DOT_SIZE / 2, 0, 2 * Math.PI);
        ctx.fillStyle = isSelected ? '#3b82f6' : '#e5e7eb';
        ctx.fill();
        ctx.strokeStyle = isSelected ? '#2563eb' : '#9ca3af';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Círculo interno (selecionado) e número da sequência
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(x, y, DOT_SIZE / 4, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          // Desenhar número da sequência
          const sequenceNumber = selectedDots.indexOf(index) + 1;
          ctx.fillStyle = '#2563eb';
          ctx.font = 'bold 12px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sequenceNumber.toString(), x, y);
        }
      }
    }
  }, [selectedDots]);

  const getDotIndex = (x: number, y: number): number | null => {
    if (!containerRef.current) return null;
    
    const rect = containerRef.current.getBoundingClientRect();
    const relativeX = x - rect.left;
    const relativeY = y - rect.top;

    const col = Math.round((relativeX - DOT_SIZE / 2) / DOT_SPACING);
    const row = Math.round((relativeY - DOT_SIZE / 2) / DOT_SPACING);

    if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
      return null;
    }

    const index = row * GRID_SIZE + col;
    return index;
  };

  const handleClick = (x: number, y: number) => {
    if (disabled) return;
    const index = getDotIndex(x, y);
    if (index !== null) {
      // Se já está selecionado, remove (permite desfazer)
      if (selectedDots.includes(index)) {
        const newDots = selectedDots.filter(dot => dot !== index);
        setSelectedDots(newDots);
        onChange?.(newDots.join('-'));
      } else {
        // Adiciona à sequência
        const newDots = [...selectedDots, index];
        setSelectedDots(newDots);
        onChange?.(newDots.join('-'));
      }
    }
  };

  const handleStart = (x: number, y: number) => {
    if (disabled) return;
    const index = getDotIndex(x, y);
    if (index !== null && !selectedDots.includes(index)) {
      // Inicia arrasto adicionando o primeiro ponto
      const newDots = [index];
      setSelectedDots(newDots);
      onChange?.(newDots.join('-'));
    }
  };

  const handleMove = (x: number, y: number) => {
    if (!isDrawing || disabled) return;
    const index = getDotIndex(x, y);
    if (index !== null && !selectedDots.includes(index)) {
      const newDots = [...selectedDots, index];
      setSelectedDots(newDots);
      onChange?.(newDots.join('-'));
    }
  };

  const handleEnd = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    if (disabled) return;
    setSelectedDots([]);
    onChange?.('');
  };

  // Handlers para mouse
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setClickStartPos({ x: e.clientX, y: e.clientY });
    // Não inicia arrasto ainda, espera para ver se é clique ou arrasto
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.preventDefault();
    // Se moveu mais de 5px, considera como arrasto
    if (clickStartPos && !isDrawing) {
      const dx = Math.abs(e.clientX - clickStartPos.x);
      const dy = Math.abs(e.clientY - clickStartPos.y);
      if (dx > 5 || dy > 5) {
        setIsDrawing(true);
        // Inicia arrasto no ponto inicial
        handleStart(clickStartPos.x, clickStartPos.y);
      }
    }
    if (isDrawing) {
      handleMove(e.clientX, e.clientY);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    // Se não estava arrastando (foi um clique simples), trata como clique
    if (!isDrawing && clickStartPos) {
      handleClick(e.clientX, e.clientY);
    }
    setClickStartPos(null);
    handleEnd();
  };

  // Handlers para touch
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  return (
    <div className={cn('space-y-2 w-full min-w-0 max-w-full', className)}>
      <div
        ref={containerRef}
        className="relative inline-block cursor-pointer select-none max-w-full"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          width={DOT_SPACING * (GRID_SIZE - 1) + DOT_SIZE}
          height={DOT_SPACING * (GRID_SIZE - 1) + DOT_SIZE}
          className="block max-w-full h-auto"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
      {selectedDots.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          Limpar padrão
        </button>
      )}
    </div>
  );
}

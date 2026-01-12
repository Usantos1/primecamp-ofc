import * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { currencyFormatters } from "@/utils/formatters"

export interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
  showCurrency?: boolean;
  className?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, showCurrency = false, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState<string>('');

    React.useEffect(() => {
      // Formatar valor inicial
      if (value !== undefined && value !== null) {
        const formatted = value.toFixed(2).replace('.', ',');
        setDisplayValue(formatted);
      } else {
        setDisplayValue('');
      }
    }, [value]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let inputValue = e.target.value;
      
      // Remover tudo exceto números e vírgula
      inputValue = inputValue.replace(/[^\d,]/g, '');
      
      // Garantir apenas uma vírgula
      const parts = inputValue.split(',');
      if (parts.length > 2) {
        inputValue = parts[0] + ',' + parts.slice(1).join('');
      }
      
      // Limitar a 2 casas decimais
      if (parts.length === 2 && parts[1].length > 2) {
        inputValue = parts[0] + ',' + parts[1].substring(0, 2);
      }
      
      setDisplayValue(inputValue);
      
      // Converter para número (substituir vírgula por ponto)
      const numericValue = parseFloat(inputValue.replace(',', '.')) || 0;
      onChange(numericValue);
    };

    const handleBlur = () => {
      // Reformatar ao perder foco
      if (value !== undefined && value !== null) {
        const formatted = value.toFixed(2).replace('.', ',');
        setDisplayValue(formatted);
      }
    };

    return (
      <div className={cn("relative", className)}>
        {showCurrency && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            R$
          </span>
        )}
        <Input
          ref={ref}
          type="text"
          value={displayValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="0,00"
          className={cn(showCurrency && "pl-8", className)}
          {...props}
        />
      </div>
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

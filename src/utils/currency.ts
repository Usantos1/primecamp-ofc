// Utility functions for currency formatting and conversion

/**
 * Converts numeric value to formatted BRL string
 * @param value - Numeric value in reais (e.g., 1234.56)
 * @returns Formatted BRL string
 */
export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

/**
 * Converts BRL string to numeric value
 * @param brlString - BRL formatted string (e.g., "R$ 1.234,56" or "1234,56")
 * @returns Numeric value in reais
 */
export function brlToNumber(brlString: string): number {
  // Remove currency symbol, spaces, and dots (thousands separator)
  const cleanString = brlString
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');

  const reais = parseFloat(cleanString);
  return isNaN(reais) ? 0 : reais;
}

/**
 * Mask input for BRL currency
 * @param value - Input value
 * @returns Masked string
 */
export function maskBRL(value: string): string {
  // Remove all non-numeric characters except comma and dot
  let numericValue = value.replace(/[^\d,\.]/g, '');
  
  if (!numericValue) return '';
  
  // Replace comma with dot for parsing
  numericValue = numericValue.replace(',', '.');
  
  // Parse to number and format
  const number = parseFloat(numericValue);
  if (isNaN(number)) return '';
  
  return formatBRL(number);
}

/**
 * Parse BRL input value to numeric for form handling
 * @param value - Form input value
 * @returns Numeric value
 */
export function parseBRLInput(value: string): number {
  if (!value) return 0;
  return brlToNumber(value);
}
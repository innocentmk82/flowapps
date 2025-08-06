export const formatCurrency = (amount: number): string => {
  return `E${amount.toLocaleString('en-SZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const parseCurrency = (value: string): number => {
  return parseFloat(value.replace(/[^\d.-]/g, '')) || 0;
};
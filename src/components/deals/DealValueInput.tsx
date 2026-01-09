import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface DealValueInputProps {
  value: string | number | null | undefined;
  onChange: (value: string) => void;
  placeholder?: string;
}

// Formata valor para exibição
const formatCurrencyDisplay = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  
  const cleaned = String(value).replace(/\D/g, '');
  if (!cleaned) return "";
  
  const numValue = parseInt(cleaned, 10);
  if (isNaN(numValue)) return "";
  
  return new Intl.NumberFormat("pt-BR").format(numValue);
};

export function DealValueInput({ value, onChange, placeholder = "0" }: DealValueInputProps) {
  const [rawValue, setRawValue] = useState<string>("");
  const [isFocused, setIsFocused] = useState(false);

  // Sincroniza rawValue quando value externo muda e não está focado
  useEffect(() => {
    if (!isFocused && value) {
      setRawValue(String(value).replace(/\D/g, ''));
    }
  }, [value, isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    // Mostra valor numérico limpo ao focar
    setRawValue(value ? String(value).replace(/\D/g, '') : "");
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Aceita apenas números
    const onlyNumbers = e.target.value.replace(/\D/g, '');
    setRawValue(onlyNumbers);
  };

  const handleBlur = () => {
    setIsFocused(false);
    // Converte para número e salva
    if (rawValue) {
      const numValue = parseInt(rawValue, 10);
      onChange(numValue.toString());
    } else {
      onChange("");
    }
  };

  return (
    <Input 
      type="text"
      inputMode="numeric"
      placeholder={placeholder}
      value={isFocused ? rawValue : formatCurrencyDisplay(value)}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

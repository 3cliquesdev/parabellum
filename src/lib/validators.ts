// Enterprise Validators for Form Builder V3

export interface ValidationResult {
  valid: boolean;
  message?: string;
}

// CPF Validator with digit verification (Receita Federal algorithm)
export function validateCPF(cpf: string): ValidationResult {
  const cleaned = cpf.replace(/\D/g, '');
  
  if (cleaned.length !== 11) {
    return { valid: false, message: 'CPF deve ter 11 dígitos' };
  }
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  // First digit verification
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  // Second digit verification
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) {
    return { valid: false, message: 'CPF inválido' };
  }
  
  return { valid: true };
}

// CNPJ Validator with digit verification
export function validateCNPJ(cnpj: string): ValidationResult {
  const cleaned = cnpj.replace(/\D/g, '');
  
  if (cleaned.length !== 14) {
    return { valid: false, message: 'CNPJ deve ter 14 dígitos' };
  }
  
  // Check for known invalid patterns
  if (/^(\d)\1+$/.test(cleaned)) {
    return { valid: false, message: 'CNPJ inválido' };
  }
  
  // First digit verification
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  const digit1 = remainder < 2 ? 0 : 11 - remainder;
  if (digit1 !== parseInt(cleaned.charAt(12))) {
    return { valid: false, message: 'CNPJ inválido' };
  }
  
  // Second digit verification
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  const digit2 = remainder < 2 ? 0 : 11 - remainder;
  if (digit2 !== parseInt(cleaned.charAt(13))) {
    return { valid: false, message: 'CNPJ inválido' };
  }
  
  return { valid: true };
}

// Corporate Email Validator (blocks personal emails)
export function validateCorporateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Formato de e-mail inválido' };
  }
  
  const personalDomains = [
    'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br',
    'live.com', 'msn.com', 'icloud.com', 'aol.com', 'protonmail.com',
    'uol.com.br', 'bol.com.br', 'terra.com.br', 'ig.com.br', 'globo.com'
  ];
  
  const domain = email.split('@')[1]?.toLowerCase();
  if (personalDomains.includes(domain)) {
    return { valid: false, message: 'Use um e-mail corporativo (não pessoal)' };
  }
  
  return { valid: true };
}

// Brazilian Phone Validator with DDD validation
export function validatePhoneBR(phone: string): ValidationResult {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length < 10 || cleaned.length > 11) {
    return { valid: false, message: 'Telefone deve ter 10 ou 11 dígitos' };
  }
  
  // Valid DDDs in Brazil
  const validDDDs = [
    '11', '12', '13', '14', '15', '16', '17', '18', '19', // São Paulo
    '21', '22', '24', // Rio de Janeiro
    '27', '28', // Espírito Santo
    '31', '32', '33', '34', '35', '37', '38', // Minas Gerais
    '41', '42', '43', '44', '45', '46', // Paraná
    '47', '48', '49', // Santa Catarina
    '51', '53', '54', '55', // Rio Grande do Sul
    '61', // Distrito Federal
    '62', '64', // Goiás
    '63', // Tocantins
    '65', '66', // Mato Grosso
    '67', // Mato Grosso do Sul
    '68', // Acre
    '69', // Rondônia
    '71', '73', '74', '75', '77', // Bahia
    '79', // Sergipe
    '81', '87', // Pernambuco
    '82', // Alagoas
    '83', // Paraíba
    '84', // Rio Grande do Norte
    '85', '88', // Ceará
    '86', '89', // Piauí
    '91', '93', '94', // Pará
    '92', '97', // Amazonas
    '95', // Roraima
    '96', // Amapá
    '98', '99', // Maranhão
  ];
  
  const ddd = cleaned.substring(0, 2);
  if (!validDDDs.includes(ddd)) {
    return { valid: false, message: 'DDD inválido' };
  }
  
  // Mobile phones start with 9
  if (cleaned.length === 11 && cleaned.charAt(2) !== '9') {
    return { valid: false, message: 'Celular deve começar com 9' };
  }
  
  return { valid: true };
}

// CEP Validator
export function validateCEP(cep: string): ValidationResult {
  const cleaned = cep.replace(/\D/g, '');
  
  if (cleaned.length !== 8) {
    return { valid: false, message: 'CEP deve ter 8 dígitos' };
  }
  
  // Basic format validation (CEP ranges in Brazil)
  const firstDigit = parseInt(cleaned.charAt(0));
  if (firstDigit < 0 || firstDigit > 9) {
    return { valid: false, message: 'CEP inválido' };
  }
  
  return { valid: true };
}

// Custom Regex Validator
export function validateCustomRegex(value: string, pattern: string, message?: string): ValidationResult {
  try {
    const regex = new RegExp(pattern);
    if (!regex.test(value)) {
      return { valid: false, message: message || 'Formato inválido' };
    }
    return { valid: true };
  } catch {
    return { valid: false, message: 'Padrão de validação inválido' };
  }
}

// Email Validator (standard)
export function validateEmail(email: string): ValidationResult {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, message: 'Formato de e-mail inválido' };
  }
  return { valid: true };
}

// URL Validator
export function validateURL(url: string): ValidationResult {
  try {
    new URL(url);
    return { valid: true };
  } catch {
    return { valid: false, message: 'URL inválida' };
  }
}

// Number Range Validator
export function validateNumberRange(value: number, min?: number, max?: number): ValidationResult {
  if (min !== undefined && value < min) {
    return { valid: false, message: `Valor mínimo: ${min}` };
  }
  if (max !== undefined && value > max) {
    return { valid: false, message: `Valor máximo: ${max}` };
  }
  return { valid: true };
}

// Master validator function
export type ValidationType = 
  | 'cpf' 
  | 'cnpj' 
  | 'corporate_email' 
  | 'email'
  | 'phone_br' 
  | 'cep' 
  | 'url'
  | 'custom_regex';

export function validate(
  type: ValidationType, 
  value: string, 
  options?: { pattern?: string; message?: string }
): ValidationResult {
  if (!value || value.trim() === '') {
    return { valid: true }; // Empty values are handled by required field check
  }
  
  switch (type) {
    case 'cpf':
      return validateCPF(value);
    case 'cnpj':
      return validateCNPJ(value);
    case 'corporate_email':
      return validateCorporateEmail(value);
    case 'email':
      return validateEmail(value);
    case 'phone_br':
      return validatePhoneBR(value);
    case 'cep':
      return validateCEP(value);
    case 'url':
      return validateURL(value);
    case 'custom_regex':
      return validateCustomRegex(value, options?.pattern || '', options?.message);
    default:
      return { valid: true };
  }
}

// Format helpers for input masks
export function formatCPF(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  return cleaned
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function formatCNPJ(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 14);
  return cleaned
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function formatPhoneBR(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 11);
  if (cleaned.length <= 10) {
    return cleaned
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return cleaned
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function formatCEP(value: string): string {
  const cleaned = value.replace(/\D/g, '').slice(0, 8);
  return cleaned.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

// Formula Parser for Form Builder V3 Calculations

export interface FormulaContext {
  [fieldId: string]: string | number | boolean | null;
}

export interface FormulaResult {
  success: boolean;
  value: number | string | boolean | null;
  error?: string;
}

// Parse and evaluate formulas with field references
// Supports: +, -, *, /, (), IF, AND, OR, MIN, MAX, AVG, SUM, ROUND, ABS
export function evaluateFormula(formula: string, context: FormulaContext): FormulaResult {
  try {
    // Replace field references {field_id} with actual values
    let expression = formula;
    const fieldPattern = /\{([^}]+)\}/g;
    let match;
    
    while ((match = fieldPattern.exec(formula)) !== null) {
      const fieldId = match[1];
      const value = context[fieldId];
      
      if (value === undefined || value === null) {
        expression = expression.replace(match[0], '0');
      } else if (typeof value === 'string') {
        // Try to parse as number, otherwise use 0
        const numValue = parseFloat(value);
        expression = expression.replace(match[0], isNaN(numValue) ? `"${value}"` : numValue.toString());
      } else if (typeof value === 'boolean') {
        expression = expression.replace(match[0], value ? '1' : '0');
      } else {
        expression = expression.replace(match[0], value.toString());
      }
    }
    
    // Parse and evaluate the expression
    const result = parseExpression(expression);
    return { success: true, value: result };
  } catch (error) {
    return { 
      success: false, 
      value: null, 
      error: error instanceof Error ? error.message : 'Erro ao avaliar fórmula' 
    };
  }
}

// Simple expression parser with support for functions
function parseExpression(expr: string): number | string | boolean {
  expr = expr.trim();
  
  // Handle IF function: IF(condition, trueValue, falseValue)
  if (expr.toUpperCase().startsWith('IF(')) {
    return parseIfFunction(expr);
  }
  
  // Handle other functions
  const funcMatch = expr.match(/^(SUM|AVG|MIN|MAX|ROUND|ABS|AND|OR)\((.*)\)$/i);
  if (funcMatch) {
    return parseFunctionCall(funcMatch[1].toUpperCase(), funcMatch[2]);
  }
  
  // Handle comparison operators
  if (expr.includes('==')) {
    const [left, right] = expr.split('==').map(s => s.trim());
    return parseExpression(left) === parseExpression(right);
  }
  if (expr.includes('!=')) {
    const [left, right] = expr.split('!=').map(s => s.trim());
    return parseExpression(left) !== parseExpression(right);
  }
  if (expr.includes('>=')) {
    const [left, right] = expr.split('>=').map(s => s.trim());
    return Number(parseExpression(left)) >= Number(parseExpression(right));
  }
  if (expr.includes('<=')) {
    const [left, right] = expr.split('<=').map(s => s.trim());
    return Number(parseExpression(left)) <= Number(parseExpression(right));
  }
  if (expr.includes('>') && !expr.includes('>=')) {
    const [left, right] = expr.split('>').map(s => s.trim());
    return Number(parseExpression(left)) > Number(parseExpression(right));
  }
  if (expr.includes('<') && !expr.includes('<=')) {
    const [left, right] = expr.split('<').map(s => s.trim());
    return Number(parseExpression(left)) < Number(parseExpression(right));
  }
  
  // Handle arithmetic (using safe evaluation)
  return evaluateArithmetic(expr);
}

function parseIfFunction(expr: string): number | string | boolean {
  // Extract content between IF( and )
  const content = expr.slice(3, -1);
  const args = splitFunctionArgs(content);
  
  if (args.length !== 3) {
    throw new Error('IF requer 3 argumentos: IF(condição, valorVerdadeiro, valorFalso)');
  }
  
  const condition = parseExpression(args[0]);
  const trueValue = parseExpression(args[1]);
  const falseValue = parseExpression(args[2]);
  
  return condition ? trueValue : falseValue;
}

function parseFunctionCall(funcName: string, argsStr: string): number {
  const args = splitFunctionArgs(argsStr).map(arg => {
    const val = parseExpression(arg);
    return typeof val === 'number' ? val : Number(val);
  });
  
  switch (funcName) {
    case 'SUM':
      return args.reduce((a, b) => a + b, 0);
    case 'AVG':
      return args.length ? args.reduce((a, b) => a + b, 0) / args.length : 0;
    case 'MIN':
      return Math.min(...args);
    case 'MAX':
      return Math.max(...args);
    case 'ROUND':
      return Math.round(args[0] * Math.pow(10, args[1] || 0)) / Math.pow(10, args[1] || 0);
    case 'ABS':
      return Math.abs(args[0]);
    case 'AND':
      return args.every(a => Boolean(a)) ? 1 : 0;
    case 'OR':
      return args.some(a => Boolean(a)) ? 1 : 0;
    default:
      throw new Error(`Função desconhecida: ${funcName}`);
  }
}

function splitFunctionArgs(argsStr: string): string[] {
  const args: string[] = [];
  let depth = 0;
  let current = '';
  
  for (const char of argsStr) {
    if (char === '(') {
      depth++;
      current += char;
    } else if (char === ')') {
      depth--;
      current += char;
    } else if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

function evaluateArithmetic(expr: string): number {
  // Remove whitespace
  expr = expr.replace(/\s+/g, '');
  
  // Handle parentheses first
  while (expr.includes('(')) {
    expr = expr.replace(/\(([^()]+)\)/g, (_, inner) => {
      return evaluateArithmetic(inner).toString();
    });
  }
  
  // Handle string values in quotes
  if (expr.startsWith('"') && expr.endsWith('"')) {
    return 0; // Strings evaluate to 0 in arithmetic
  }
  
  // Split by + and - (respecting operator precedence)
  const addTerms = splitByOperators(expr, ['+', '-']);
  if (addTerms.length > 1) {
    let result = 0;
    let operator = '+';
    for (const term of addTerms) {
      if (term === '+' || term === '-') {
        operator = term;
      } else {
        const value = evaluateArithmetic(term);
        result = operator === '+' ? result + value : result - value;
      }
    }
    return result;
  }
  
  // Split by * and /
  const mulTerms = splitByOperators(expr, ['*', '/']);
  if (mulTerms.length > 1) {
    let result = 1;
    let operator = '*';
    let isFirst = true;
    for (const term of mulTerms) {
      if (term === '*' || term === '/') {
        operator = term;
      } else {
        const value = evaluateArithmetic(term);
        if (isFirst) {
          result = value;
          isFirst = false;
        } else {
          result = operator === '*' ? result * value : result / value;
        }
      }
    }
    return result;
  }
  
  // Parse as number
  const num = parseFloat(expr);
  if (isNaN(num)) {
    throw new Error(`Valor inválido: ${expr}`);
  }
  return num;
}

function splitByOperators(expr: string, operators: string[]): string[] {
  const result: string[] = [];
  let current = '';
  let i = 0;
  
  while (i < expr.length) {
    let found = false;
    for (const op of operators) {
      if (expr.slice(i, i + op.length) === op) {
        if (current) result.push(current);
        result.push(op);
        current = '';
        i += op.length;
        found = true;
        break;
      }
    }
    if (!found) {
      current += expr[i];
      i++;
    }
  }
  
  if (current) result.push(current);
  return result;
}

// Validate formula syntax before saving
export function validateFormulaSyntax(formula: string): { valid: boolean; error?: string } {
  try {
    // Check for balanced parentheses
    let depth = 0;
    for (const char of formula) {
      if (char === '(') depth++;
      if (char === ')') depth--;
      if (depth < 0) return { valid: false, error: 'Parênteses desbalanceados' };
    }
    if (depth !== 0) return { valid: false, error: 'Parênteses desbalanceados' };
    
    // Check for valid field references
    const fieldPattern = /\{([^}]+)\}/g;
    let match;
    while ((match = fieldPattern.exec(formula)) !== null) {
      if (!match[1] || match[1].trim() === '') {
        return { valid: false, error: 'Referência de campo vazia' };
      }
    }
    
    // Try to evaluate with dummy values
    const testContext: FormulaContext = {};
    const fieldRefs = formula.match(fieldPattern) || [];
    fieldRefs.forEach(ref => {
      const fieldId = ref.slice(1, -1);
      testContext[fieldId] = 1;
    });
    
    const result = evaluateFormula(formula, testContext);
    if (!result.success) {
      return { valid: false, error: result.error };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Sintaxe inválida' 
    };
  }
}

// Extract field references from formula
export function extractFieldReferences(formula: string): string[] {
  const fieldPattern = /\{([^}]+)\}/g;
  const fields: string[] = [];
  let match;
  
  while ((match = fieldPattern.exec(formula)) !== null) {
    const fieldId = match[1];
    if (!fields.includes(fieldId)) {
      fields.push(fieldId);
    }
  }
  
  return fields;
}

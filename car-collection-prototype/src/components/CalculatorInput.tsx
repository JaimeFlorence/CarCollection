'use client';

import { useState, useRef, useEffect } from 'react';

interface CalculatorInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  step?: string;
}

// Safe math expression evaluator - no eval()!
function evaluateExpression(expr: string): number | null {
  // Remove the leading = if present
  const cleanExpr = expr.startsWith('=') ? expr.substring(1) : expr;
  
  // Basic validation: only allow numbers, operators, parentheses, and decimal points
  if (!/^[\d\s+\-*/().]+$/.test(cleanExpr)) {
    return null;
  }
  
  try {
    // Convert the expression to postfix notation and evaluate
    return evaluatePostfix(infixToPostfix(cleanExpr));
  } catch {
    return null;
  }
}

// Convert infix to postfix notation (Shunting Yard algorithm)
function infixToPostfix(expr: string): string[] {
  const output: string[] = [];
  const operators: string[] = [];
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };
  
  // Tokenize the expression
  const tokens = expr.match(/\d+\.?\d*|[+\-*/()]/g) || [];
  
  for (const token of tokens) {
    if (/^\d+\.?\d*$/.test(token)) {
      // Number
      output.push(token);
    } else if (token === '(') {
      operators.push(token);
    } else if (token === ')') {
      while (operators.length > 0 && operators[operators.length - 1] !== '(') {
        output.push(operators.pop()!);
      }
      operators.pop(); // Remove the '('
    } else if (['+', '-', '*', '/'].includes(token)) {
      while (
        operators.length > 0 &&
        operators[operators.length - 1] !== '(' &&
        precedence[operators[operators.length - 1]] >= precedence[token]
      ) {
        output.push(operators.pop()!);
      }
      operators.push(token);
    }
  }
  
  while (operators.length > 0) {
    output.push(operators.pop()!);
  }
  
  return output;
}

// Evaluate postfix expression
function evaluatePostfix(tokens: string[]): number {
  const stack: number[] = [];
  
  for (const token of tokens) {
    if (/^\d+\.?\d*$/.test(token)) {
      stack.push(parseFloat(token));
    } else {
      if (stack.length < 2) throw new Error('Invalid expression');
      const b = stack.pop()!;
      const a = stack.pop()!;
      
      switch (token) {
        case '+':
          stack.push(a + b);
          break;
        case '-':
          stack.push(a - b);
          break;
        case '*':
          stack.push(a * b);
          break;
        case '/':
          if (b === 0) throw new Error('Division by zero');
          stack.push(a / b);
          break;
      }
    }
  }
  
  if (stack.length !== 1 || isNaN(stack[0])) {
    throw new Error('Invalid expression');
  }
  
  return stack[0];
}

export default function CalculatorInput({
  value,
  onChange,
  placeholder = '0.00',
  className = '',
  id,
  step = '0.01'
}: CalculatorInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const expressionRef = useRef<string>('');
  const calculatedValueRef = useRef<string>('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Update display value when parent value changes
  useEffect(() => {
    // Only update if it's not the value we just calculated
    if (value !== calculatedValueRef.current || !expressionRef.current) {
      setDisplayValue(value);
    }
  }, [value]);
  
  const handleFocus = () => {
    setIsFocused(true);
    // If we have a stored expression, show it
    if (expressionRef.current && displayValue === calculatedValueRef.current) {
      setDisplayValue(expressionRef.current);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    
    if (displayValue.startsWith('=')) {
      const result = evaluateExpression(displayValue);
      if (result !== null) {
        // Store the expression and calculated value
        expressionRef.current = displayValue;
        const formattedResult = result.toFixed(2);
        calculatedValueRef.current = formattedResult;
        setDisplayValue(formattedResult);
        onChange(formattedResult);
      } else {
        // Invalid expression, revert
        setDisplayValue(value);
        expressionRef.current = '';
        calculatedValueRef.current = '';
      }
    } else {
      // Regular number input
      if (displayValue !== value) {
        onChange(displayValue);
      }
      // Clear expression if user typed a regular number
      if (displayValue !== calculatedValueRef.current) {
        expressionRef.current = '';
        calculatedValueRef.current = '';
      }
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // If user is typing a regular number (not expression), update parent
    if (!newValue.startsWith('=')) {
      onChange(newValue);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };
  
  const hasExpression = !!expressionRef.current && displayValue === calculatedValueRef.current;
  
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`${className} ${displayValue.startsWith('=') ? 'font-mono' : ''}`}
        title={hasExpression ? `Formula: ${expressionRef.current}` : undefined}
      />
      {hasExpression && !isFocused && (
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2" 
          title={`Formula: ${expressionRef.current}`}
        >
          <svg 
            className="w-4 h-4 text-slate-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" 
            />
          </svg>
        </div>
      )}
    </div>
  );
}
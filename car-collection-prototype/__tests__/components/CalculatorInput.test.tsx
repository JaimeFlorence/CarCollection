import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalculatorInput from '@/components/CalculatorInput';

describe('CalculatorInput', () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  describe('Basic Input Functionality', () => {
    it('renders with initial value', () => {
      render(<CalculatorInput value="42.50" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('42.50');
    });

    it('handles regular number input', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '123.45');
      expect(mockOnChange).toHaveBeenLastCalledWith('123.45');
    });

    it('displays placeholder when empty', () => {
      render(<CalculatorInput value="" onChange={mockOnChange} placeholder="0.00" />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', '0.00');
    });
  });

  describe('Calculator Functionality', () => {
    it('evaluates simple addition', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10+5');
      await user.tab(); // Blur the input
      
      expect(input).toHaveValue('15.00');
      expect(mockOnChange).toHaveBeenLastCalledWith('15.00');
    });

    it('evaluates subtraction', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=20-7');
      await user.tab();
      
      expect(input).toHaveValue('13.00');
      expect(mockOnChange).toHaveBeenLastCalledWith('13.00');
    });

    it('evaluates multiplication', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=4*3.5');
      await user.tab();
      
      expect(input).toHaveValue('14.00');
      expect(mockOnChange).toHaveBeenLastCalledWith('14.00');
    });

    it('evaluates division', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=20/4');
      await user.tab();
      
      expect(input).toHaveValue('5.00');
      expect(mockOnChange).toHaveBeenLastCalledWith('5.00');
    });

    it('evaluates complex expressions with parentheses', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=(10+5)*2');
      await user.tab();
      
      expect(input).toHaveValue('30.00');
      expect(mockOnChange).toHaveBeenLastCalledWith('30.00');
    });

    it('evaluates expressions with decimals', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=27.15+13.95');
      await user.tab();
      
      expect(input).toHaveValue('41.10');
      expect(mockOnChange).toHaveBeenLastCalledWith('41.10');
    });

    it('follows order of operations', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10+5*2');
      await user.tab();
      
      expect(input).toHaveValue('20.00'); // Not 30.00
      expect(mockOnChange).toHaveBeenLastCalledWith('20.00');
    });
  });

  describe('Focus/Blur Behavior', () => {
    it('shows expression when focused after calculation', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      // Enter and evaluate expression
      await user.type(input, '=10+5');
      await user.tab();
      expect(input).toHaveValue('15.00');
      
      // Focus again - should show original expression
      await user.click(input);
      expect(input).toHaveValue('=10+5');
    });

    it('evaluates on Enter key', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10+5');
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        expect(input).toHaveValue('15.00');
        expect(mockOnChange).toHaveBeenLastCalledWith('15.00');
      });
    });
  });

  describe('Error Handling', () => {
    it('handles invalid expressions gracefully', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="10" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.clear(input);
      await user.type(input, '=10++5');
      await user.tab();
      
      // Should revert to original value
      expect(input).toHaveValue('10');
      expect(mockOnChange).not.toHaveBeenCalledWith('NaN');
    });

    it('handles division by zero', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="10" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.clear(input);
      await user.type(input, '=10/0');
      await user.tab();
      
      // Should revert to original value
      expect(input).toHaveValue('10');
    });

    it('rejects invalid characters', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="10" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.clear(input);
      await user.type(input, '=10+abc');
      await user.tab();
      
      // Should revert to original value
      expect(input).toHaveValue('10');
    });

    it('handles empty expressions', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="10" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.clear(input);
      await user.type(input, '=');
      await user.tab();
      
      // Should revert to original value
      expect(input).toHaveValue('10');
    });
  });

  describe('Visual Indicators', () => {
    it('adds calculator icon when expression is stored', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10+5');
      await user.tab();
      
      // Should show calculator icon (there will be two elements with this title)
      const icons = screen.getAllByTitle('Formula: =10+5');
      expect(icons.length).toBeGreaterThan(0);
      // The div containing the SVG should be there
      const iconContainer = icons.find(el => el.tagName === 'DIV');
      expect(iconContainer).toBeInTheDocument();
    });

    it('applies monospace font for expressions', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} className="base-class" />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10+5');
      expect(input).toHaveClass('font-mono');
    });
  });

  describe('Edge Cases', () => {
    it('handles multiple decimal points correctly', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10.5+5.5');
      await user.tab();
      
      expect(input).toHaveValue('16.00');
    });

    it('handles negative numbers', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '=10-15');
      await user.tab();
      
      expect(input).toHaveValue('-5.00');
    });

    it('handles spaces in expressions', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      await user.type(input, '= 10 + 5 ');
      await user.tab();
      
      expect(input).toHaveValue('15.00');
    });

    it('preserves expression when re-editing', async () => {
      const user = userEvent.setup();
      render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      // First calculation
      await user.type(input, '=10+5');
      await user.tab();
      expect(input).toHaveValue('15.00');
      
      // Click to edit - should show expression
      await user.click(input);
      expect(input).toHaveValue('=10+5');
      
      // Modify expression
      await user.clear(input);
      await user.type(input, '=10+6');
      await user.tab();
      expect(input).toHaveValue('16.00');
    });

    it('preserves expression even after parent updates value', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<CalculatorInput value="" onChange={mockOnChange} />);
      const input = screen.getByRole('textbox');
      
      // Enter and evaluate expression
      await user.type(input, '=20+30');
      await user.tab();
      expect(input).toHaveValue('50.00');
      expect(mockOnChange).toHaveBeenCalledWith('50.00');
      
      // Simulate parent updating with the calculated value
      rerender(<CalculatorInput value="50.00" onChange={mockOnChange} />);
      expect(input).toHaveValue('50.00');
      
      // Click to edit - should still show the original expression
      await user.click(input);
      expect(input).toHaveValue('=20+30');
    });
  });
});
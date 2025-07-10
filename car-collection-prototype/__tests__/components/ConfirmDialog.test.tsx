import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConfirmDialog from '@/components/ConfirmDialog';

describe('ConfirmDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();
  
  const defaultProps = {
    isOpen: true,
    onClose: mockOnClose,
    onConfirm: mockOnConfirm,
    title: 'Test Title',
    message: 'Test message'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
  });

  it('uses custom button text when provided', () => {
    render(
      <ConfirmDialog 
        {...defaultProps} 
        confirmText="Delete" 
        cancelText="Keep" 
      />
    );
    
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('applies custom confirm button class', () => {
    render(
      <ConfirmDialog 
        {...defaultProps} 
        confirmButtonClass="bg-green-600"
      />
    );
    
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton).toHaveClass('bg-green-600');
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls both onConfirm and onClose when confirm button is clicked', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    const confirmButton = screen.getByText('Confirm');
    fireEvent.click(confirmButton);
    
    expect(mockOnConfirm).toHaveBeenCalledTimes(1);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders with backdrop', () => {
    render(<ConfirmDialog {...defaultProps} />);
    
    // Check for the backdrop element
    const backdrop = screen.getByText('Test Title').closest('.fixed.inset-0');
    expect(backdrop).toHaveClass('bg-black', 'bg-opacity-50');
  });
});
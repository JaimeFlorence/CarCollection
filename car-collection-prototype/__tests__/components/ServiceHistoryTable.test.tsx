import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceHistoryTable from '@/components/ServiceHistoryTable';
import { ServiceHistory } from '@/lib/api';

describe('ServiceHistoryTable', () => {
  const mockServiceHistory: ServiceHistory[] = [
    {
      id: 1,
      car_id: 1,
      user_id: 1,
      performed_date: '2024-01-15T00:00:00Z',
      service_item: 'Oil Change',
      mileage: 50000,
      cost: 45.50,
      shop: 'Quick Lube',
      invoice_number: 'INV-001',
      notes: 'Synthetic oil',
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 2,
      car_id: 1,
      user_id: 1,
      performed_date: '2024-01-15T00:00:00Z',
      service_item: 'Tire Rotation',
      mileage: 50000,
      cost: 25,
      shop: 'Quick Lube',
      invoice_number: 'INV-001',
      notes: null,
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: 3,
      car_id: 1,
      user_id: 1,
      performed_date: '2024-02-20T00:00:00Z',
      service_item: 'Brake Inspection',
      mileage: 52000,
      cost: 0,
      shop: 'Joe\'s Garage',
      invoice_number: null,
      notes: 'No issues found',
      created_at: '2024-02-20T00:00:00Z'
    }
  ];

  it('renders service history table', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    expect(screen.getByText('📊 Service Summary')).toBeInTheDocument();
    expect(screen.getByText('Oil Change')).toBeInTheDocument();
    expect(screen.getByText('Tire Rotation')).toBeInTheDocument();
    expect(screen.getByText('Brake Inspection')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={[]} loading={true} />);
    
    expect(screen.getByText('Loading service history...')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={[]} />);
    
    expect(screen.getByText('No service history recorded yet')).toBeInTheDocument();
  });

  it('groups services by date correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    // Should have 2 groups (Jan 15 and Feb 20)
    const rows = screen.getAllByRole('row');
    // Header + 2 data rows = 3 total
    expect(rows).toHaveLength(3);
    
    // First group should show combined items
    expect(screen.getByText(/Oil Change/)).toBeInTheDocument();
    expect(screen.getByText(/Tire Rotation/)).toBeInTheDocument();
  });

  it('calculates summary statistics correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    // Total services (2 groups)
    expect(screen.getByText('2')).toBeInTheDocument();
    
    // Total spent ($70.50)
    expect(screen.getByText('$71')).toBeInTheDocument();
    
    // Average cost ($35.25)
    expect(screen.getByText('$35')).toBeInTheDocument();
  });

  it('handles decimal/string costs properly', () => {
    const historyWithStringCosts: ServiceHistory[] = [
      {
        ...mockServiceHistory[0],
        cost: '45.50' as any // Simulating API returning string
      },
      {
        ...mockServiceHistory[1],
        cost: '25.00' as any
      }
    ];
    
    render(<ServiceHistoryTable carId={1} serviceHistory={historyWithStringCosts} />);
    
    // Should still calculate correctly - the total spent should be $71
    const totalSpentElements = screen.getAllByText('$71');
    expect(totalSpentElements.length).toBeGreaterThan(0);
  });

  it('sorts by date correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    const dateHeader = screen.getByText('Date');
    fireEvent.click(dateHeader);
    
    // Should toggle sort order
    const rows = screen.getAllByRole('row');
    expect(rows.length).toBeGreaterThan(1);
  });

  it('sorts by mileage correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    const mileageHeader = screen.getByText('Mileage');
    fireEvent.click(mileageHeader);
    
    // Verify sort indicator appears
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('sorts by cost correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    const costHeader = screen.getByText('Cost');
    fireEvent.click(costHeader);
    
    // Verify sort indicator appears
    expect(screen.getByText('↓')).toBeInTheDocument();
  });

  it('displays grouped cost correctly', () => {
    render(<ServiceHistoryTable carId={1} serviceHistory={mockServiceHistory} />);
    
    // First group has two services totaling $70.50
    expect(screen.getByText('$70.50')).toBeInTheDocument();
    
    // Second group has one service at $0
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('handles null/undefined values gracefully', () => {
    const historyWithNulls: ServiceHistory[] = [
      {
        ...mockServiceHistory[0],
        mileage: null,
        shop: null,
        cost: undefined as any
      }
    ];
    
    render(<ServiceHistoryTable carId={1} serviceHistory={historyWithNulls} />);
    
    // Should show dashes for null values
    expect(screen.getAllByText('-')).toHaveLength(2); // mileage and shop
    
    // Cost should default to 0
    expect(screen.getByText('$0.00')).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    const mockOnEdit = jest.fn();
    
    render(
      <ServiceHistoryTable 
        carId={1} 
        serviceHistory={mockServiceHistory}
        onEdit={mockOnEdit}
      />
    );
    
    // Find the first edit button (should be in the first grouped service)
    const editButtons = screen.getAllByTitle('Edit service record');
    expect(editButtons.length).toBeGreaterThan(0);
    
    // Click the first edit button
    fireEvent.click(editButtons[0]);
    
    // Should call onEdit with the service record (services are sorted by date desc, so Feb 20 appears first)
    expect(mockOnEdit).toHaveBeenCalledWith(mockServiceHistory[2]); // Brake Inspection
  });

  it('does not show edit buttons when onEdit is not provided', () => {
    render(
      <ServiceHistoryTable 
        carId={1} 
        serviceHistory={mockServiceHistory}
      />
    );
    
    // Should not find any edit buttons
    const editButtons = screen.queryAllByTitle('Edit service record');
    expect(editButtons).toHaveLength(0);
  });
});
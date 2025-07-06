import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CarDetails from '../[id]/page';
import { apiService } from '../../../lib/api';
import React from 'react';

describe('CarDetails Overview Panel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('renders car overview data', async () => {
    const mockCar = {
      id: 1,
      make: 'Honda',
      model: 'Civic',
      year: 2015,
      vin: '1234567890',
      mileage: 90000,
      license_plate: 'XYZ-123',
      insurance_info: 'Test Insurance',
      notes: 'Test notes',
      fuel: [],
      service: [],
      repairs: [],
      photos: [],
      created_at: '2024-07-04T00:00:00Z',
      updated_at: '2024-07-04T00:00:00Z',
    };
    jest.spyOn(apiService, 'getCar').mockResolvedValue(mockCar);
    render(<CarDetails params={{ id: '1' }} />);
    await waitFor(() => expect(screen.getByText(/Honda Civic/i)).toBeInTheDocument());
    expect(screen.getByText(/2015 Honda Civic/i)).toBeInTheDocument();
    expect(screen.getByText(/Mileage:/i)).toBeInTheDocument();
    expect(screen.getByText(/XYZ-123/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Insurance/i)).toBeInTheDocument();
    expect(screen.getByText(/Test notes/i)).toBeInTheDocument();
  });
}); 
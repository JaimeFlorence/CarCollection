import { render, screen, waitFor } from '@testing-library/react';
import CarDetails from './page';
import * as api from '../../../lib/api';
import React from 'react';

jest.mock('../../../lib/api');

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
};

describe('CarDetails Overview Panel', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (api.apiService.getCar as jest.Mock).mockResolvedValue(mockCar);
  });

  it('renders car overview data', async () => {
    render(<CarDetails params={{ id: '1' }} />);
    await waitFor(() => expect(screen.getByText(/Honda Civic/i)).toBeInTheDocument());
    expect(screen.getByText(/2015 Honda Civic/i)).toBeInTheDocument();
    expect(screen.getByText(/Mileage:/i)).toBeInTheDocument();
    expect(screen.getByText(/XYZ-123/i)).toBeInTheDocument();
    expect(screen.getByText(/Test Insurance/i)).toBeInTheDocument();
    expect(screen.getByText(/Test notes/i)).toBeInTheDocument();
  });
}); 
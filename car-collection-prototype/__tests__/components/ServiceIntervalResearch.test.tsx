import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ServiceIntervalResearch from '@/components/ServiceIntervalResearch';
import { Car } from '@/lib/api';

const mockCar: Car = {
  id: 1,
  user_id: 1,
  make: 'Tesla',
  model: 'Model 3',
  year: 2020,
  mileage: 25000,
  license_plate: 'TEST123',
  insurance_info: 'Geico',
  notes: 'Test car',
  group_name: 'Daily Drivers',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z'
};

const mockOnResearch = jest.fn();
const mockOnSkip = jest.fn();

describe('ServiceIntervalResearch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders research form initially', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
      />
    );

    expect(screen.getByText('Research Maintenance Intervals?')).toBeInTheDocument();
    // Check if the car info is displayed in a single span
    expect(screen.getByText('2020 Tesla Model 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /research now/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /i'll add my own/i })).toBeInTheDocument();
  });

  it('calls onResearch when Research Now button is clicked', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
      />
    );

    const researchButton = screen.getByRole('button', { name: /research now/i });
    fireEvent.click(researchButton);

    expect(mockOnResearch).toHaveBeenCalledTimes(1);
    expect(mockOnSkip).not.toHaveBeenCalled();
  });

  it('calls onSkip when I\'ll Add My Own button is clicked', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
      />
    );

    const skipButton = screen.getByRole('button', { name: /i'll add my own/i });
    fireEvent.click(skipButton);

    expect(mockOnSkip).toHaveBeenCalledTimes(1);
    expect(mockOnResearch).not.toHaveBeenCalled();
  });

  it('shows details when Show Details button is clicked', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
      />
    );

    const detailsButton = screen.getByRole('button', { name: /show details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText("What we'll research:")).toBeInTheDocument();
    expect(screen.getByText(/oil change intervals/i)).toBeInTheDocument();
    expect(screen.getByText(/tire rotation schedules/i)).toBeInTheDocument();
  });

  it('hides details when Hide Details button is clicked', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
      />
    );

    const detailsButton = screen.getByRole('button', { name: /show details/i });
    fireEvent.click(detailsButton);

    expect(screen.getByText("What we'll research:")).toBeInTheDocument();

    const hideButton = screen.getByRole('button', { name: /hide details/i });
    fireEvent.click(hideButton);

    expect(screen.queryByText("What we'll research:")).not.toBeInTheDocument();
  });

  it('disables buttons when loading', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    const researchButton = screen.getByRole('button', { name: /researching/i });
    const skipButton = screen.getByRole('button', { name: /i'll add my own/i });

    expect(researchButton).toBeDisabled();
    expect(skipButton).toBeDisabled();
  });

  it('shows spinner when loading', () => {
    render(
      <ServiceIntervalResearch
        car={mockCar}
        onResearch={mockOnResearch}
        onSkip={mockOnSkip}
        isLoading={true}
      />
    );

    // Check for spinner element - the button text changes when loading
    const researchButton = screen.getByRole('button', { name: /researching/i });
    expect(researchButton).toBeInTheDocument();
    // The spinner is visible as an svg element within the button
    expect(researchButton.innerHTML).toContain('animate-spin');
  });
});
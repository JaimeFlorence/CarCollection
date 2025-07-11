import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChangePasswordDialog } from '@/components/ChangePasswordDialog';
import { apiService } from '@/lib/api';
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock('@/lib/api', () => ({
  apiService: {
    changePassword: jest.fn(),
  },
}));

// Mock AuthContext
const mockUser = { id: 1, username: 'testuser', is_admin: false };
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ChangePasswordDialog', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not render when isOpen is false', () => {
    render(<ChangePasswordDialog isOpen={false} onClose={mockOnClose} />);
    expect(screen.queryByText('Change Password')).not.toBeInTheDocument();
  });

  it('should render when isOpen is true', () => {
    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);
    expect(screen.getByText('Change Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
    expect(screen.getByLabelText('New Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
  });

  it('should validate password match', async () => {
    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpass' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New passwords do not match')).toBeInTheDocument();
    });

    expect(mockApiService.changePassword).not.toHaveBeenCalled();
  });

  it('should validate password length', async () => {
    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 6 characters long')).toBeInTheDocument();
    });

    expect(mockApiService.changePassword).not.toHaveBeenCalled();
  });

  it('should successfully change password', async () => {
    mockApiService.changePassword.mockResolvedValue({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      is_active: true,
      is_admin: false,
      email_verified: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });

    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockApiService.changePassword).toHaveBeenCalledWith('currentpass', 'newpass123');
    });

    await waitFor(() => {
      expect(screen.getByText('Password changed successfully!')).toBeInTheDocument();
    });

    // Wait for dialog to close
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  it('should show error message on API failure', async () => {
    mockApiService.changePassword.mockRejectedValue({
      response: {
        data: {
          detail: 'Current password is incorrect',
        },
      },
    });

    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'wrongpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Current password is incorrect')).toBeInTheDocument();
    });
  });

  it('should show generic error on network failure', async () => {
    mockApiService.changePassword.mockRejectedValue(new Error('Network error'));

    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to change password. Please try again.')).toBeInTheDocument();
    });
  });

  it('should disable form during submission', async () => {
    let resolvePromise: any;
    mockApiService.changePassword.mockReturnValue(
      new Promise((resolve) => {
        resolvePromise = resolve;
      })
    );

    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    const submitButton = screen.getByText('Change Password') as HTMLButtonElement;
    const cancelButton = screen.getByText('Cancel') as HTMLButtonElement;

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton.textContent).toBe('Changing...');
      expect(currentPasswordInput.disabled).toBe(true);
      expect(newPasswordInput.disabled).toBe(true);
      expect(confirmPasswordInput.disabled).toBe(true);
      expect(submitButton.disabled).toBe(true);
      expect(cancelButton.disabled).toBe(true);
    });

    resolvePromise({
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      is_active: true,
      is_admin: false,
      email_verified: true,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
    });
  });

  it('should clear form when Cancel is clicked', () => {
    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('New Password') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password') as HTMLInputElement;
    const cancelButton = screen.getByText('Cancel');

    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'newpass123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'newpass123' } });

    fireEvent.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should clear error message when typing', async () => {
    render(<ChangePasswordDialog isOpen={true} onClose={mockOnClose} />);

    const currentPasswordInput = screen.getByLabelText('Current Password');
    const newPasswordInput = screen.getByLabelText('New Password');
    const confirmPasswordInput = screen.getByLabelText('Confirm New Password');
    const submitButton = screen.getByText('Change Password');

    // Create an error
    fireEvent.change(currentPasswordInput, { target: { value: 'currentpass' } });
    fireEvent.change(newPasswordInput, { target: { value: 'short' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New password must be at least 6 characters long')).toBeInTheDocument();
    });

    // Type in any field to clear error
    fireEvent.change(newPasswordInput, { target: { value: 'longer123' } });

    expect(screen.queryByText('New password must be at least 6 characters long')).not.toBeInTheDocument();
  });
});
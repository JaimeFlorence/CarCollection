import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import AdminPage from '@/app/admin/page';
import { apiService } from '@/lib/api';
// Mock AuthContext since it's not exported
const AuthContext = React.createContext<any>(null);
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock api service
jest.mock('@/lib/api', () => ({
  apiService: {
    getUsers: jest.fn(),
    createUserByAdmin: jest.fn(),
    updateUser: jest.fn(),
  },
}));

// Mock components
jest.mock('@/components/Header', () => ({
  Header: () => <div data-testid="header">Header</div>,
}));

jest.mock('@/components/DataManagement', () => ({
  DataManagement: () => <div data-testid="data-management">Data Management</div>,
}));

jest.mock('@/components/InvitationManagement', () => ({
  InvitationManagement: () => <div data-testid="invitation-management">Invitation Management</div>,
}));

jest.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockPush = jest.fn();
const mockApiService = apiService as jest.Mocked<typeof apiService>;

const mockAuthContextValue = {
  user: { id: 1, username: 'admin', is_admin: true },
  token: 'mock-token',
  loading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
};

const mockUsers = [
  {
    id: 1,
    username: 'admin',
    email: 'admin@example.com',
    is_active: true,
    is_admin: true,
    email_verified: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 2,
    username: 'testuser',
    email: 'test@example.com',
    is_active: true,
    is_admin: false,
    email_verified: true,
    created_at: '2025-01-02T00:00:00Z',
    updated_at: '2025-01-02T00:00:00Z',
  },
  {
    id: 3,
    username: 'inactiveuser',
    email: 'inactive@example.com',
    is_active: false,
    is_admin: false,
    email_verified: true,
    created_at: '2025-01-03T00:00:00Z',
    updated_at: '2025-01-03T00:00:00Z',
  },
];

describe('AdminPage', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
    mockApiService.getUsers.mockResolvedValue(mockUsers);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWithAuth = () => {
    return render(
      <AuthContext.Provider value={mockAuthContextValue}>
        <AdminPage />
      </AuthContext.Provider>
    );
  };

  describe('User Display', () => {
    it('should display all users in the table', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('admin')).toBeInTheDocument();
        expect(screen.getByText('testuser')).toBeInTheDocument();
        expect(screen.getByText('inactiveuser')).toBeInTheDocument();
      });

      // Check user roles
      expect(screen.getAllByText('Administrator').length).toBe(1);
      // Use more specific queries to avoid matching button text
      const userRoleBadges = screen.getAllByText('User').filter(element => 
        element.className.includes('text-gray-800')
      );
      expect(userRoleBadges.length).toBe(2);

      // Check status
      expect(screen.getAllByText('Active').length).toBe(2);
      expect(screen.getAllByText('Inactive').length).toBe(1);
    });

    it('should show loading state initially', () => {
      renderWithAuth();
      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });

    it('should show error message on failed load', async () => {
      mockApiService.getUsers.mockRejectedValue(new Error('Failed to load'));
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      });
    });
  });

  describe('Edit User Dialog', () => {
    it('should open edit dialog when Edit button is clicked', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]); // Click edit for testuser

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument();
    });

    it('should pre-populate form fields correctly', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const usernameInput = screen.getByDisplayValue('testuser') as HTMLInputElement;
      const emailInput = screen.getByDisplayValue('test@example.com') as HTMLInputElement;
      const adminCheckbox = screen.getByLabelText('Administrator') as HTMLInputElement;
      const activeCheckbox = screen.getByLabelText('Active Account') as HTMLInputElement;

      expect(usernameInput.value).toBe('testuser');
      expect(emailInput.value).toBe('test@example.com');
      expect(adminCheckbox.checked).toBe(false);
      expect(activeCheckbox.checked).toBe(true);
    });

    it('should show warning when unchecking Active Account', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const activeCheckbox = screen.getByLabelText('Active Account');
      fireEvent.click(activeCheckbox);

      expect(screen.getByText(/Disabling this account will prevent the user from logging in/)).toBeInTheDocument();
    });
  });

  describe('User Update Functionality', () => {
    it('should successfully update user when form is submitted', async () => {
      mockApiService.updateUser.mockResolvedValue({
        ...mockUsers[1],
        username: 'updateduser',
        email: 'updated@example.com',
      });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const usernameInput = screen.getByDisplayValue('testuser');
      fireEvent.change(usernameInput, { target: { value: 'updateduser' } });

      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApiService.updateUser).toHaveBeenCalledWith(2, {
          username: 'updateduser',
          email: 'test@example.com',
          is_admin: false,
          is_active: true,
        });
      });

      expect(mockApiService.getUsers).toHaveBeenCalledTimes(2); // Initial load + refresh
    });

    it('should handle password update correctly', async () => {
      mockApiService.updateUser.mockResolvedValue(mockUsers[1]);

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const passwordInput = screen.getByPlaceholderText('Enter new password');
      fireEvent.change(passwordInput, { target: { value: 'newpassword123' } });

      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApiService.updateUser).toHaveBeenCalledWith(2, {
          username: 'testuser',
          email: 'test@example.com',
          password: 'newpassword123',
          is_admin: false,
          is_active: true,
        });
      });
    });

    it('should disable user when Active Account is unchecked', async () => {
      mockApiService.updateUser.mockResolvedValue({
        ...mockUsers[1],
        is_active: false,
      });

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const activeCheckbox = screen.getByLabelText('Active Account');
      fireEvent.click(activeCheckbox);

      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApiService.updateUser).toHaveBeenCalledWith(2, {
          username: 'testuser',
          email: 'test@example.com',
          is_admin: false,
          is_active: false,
        });
      });
    });

    it('should show error message on update failure', async () => {
      mockApiService.updateUser.mockRejectedValue(new Error('Update failed'));

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(screen.getByText('Failed to update user')).toBeInTheDocument();
      });
    });

    it('should close dialog when Cancel is clicked', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      expect(screen.getByText('Edit User')).toBeInTheDocument();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(screen.queryByText('Edit User')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty password field correctly (no password update)', async () => {
      mockApiService.updateUser.mockResolvedValue(mockUsers[1]);

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      // Leave password field empty
      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockApiService.updateUser).toHaveBeenCalledWith(2, {
          username: 'testuser',
          email: 'test@example.com',
          is_admin: false,
          is_active: true,
        });
      });

      // Ensure password field is not included when empty
      const call = mockApiService.updateUser.mock.calls[0][1];
      expect(call).not.toHaveProperty('password');
    });

    it('should show loading state on update button during submission', async () => {
      let resolveUpdate: any;
      mockApiService.updateUser.mockReturnValue(
        new Promise((resolve) => {
          resolveUpdate = resolve;
        })
      );

      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      const updateButton = screen.getByText('Update User');
      fireEvent.click(updateButton);

      expect(screen.getByText('Updating...')).toBeInTheDocument();
      expect(updateButton).toBeDisabled();

      await act(async () => {
        resolveUpdate(mockUsers[1]);
      });
    });

    it('should maintain state when switching between edit dialogs', async () => {
      renderWithAuth();

      await waitFor(() => {
        expect(screen.getByText('testuser')).toBeInTheDocument();
      });

      // Edit first user
      let editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      expect(screen.getByDisplayValue('testuser')).toBeInTheDocument();

      // Cancel and edit another user
      fireEvent.click(screen.getByText('Cancel'));

      editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[2]); // Edit inactive user

      expect(screen.getByDisplayValue('inactiveuser')).toBeInTheDocument();
      const activeCheckbox = screen.getByLabelText('Active Account') as HTMLInputElement;
      expect(activeCheckbox.checked).toBe(false);
    });
  });
});
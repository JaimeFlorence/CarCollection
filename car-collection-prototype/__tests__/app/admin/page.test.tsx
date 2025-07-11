import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPage from '@/app/admin/page';
import { apiService } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Mock the dependencies
jest.mock('@/lib/api');
jest.mock('@/contexts/AuthContext');

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/components/Header', () => ({
  Header: () => <div>Header</div>
}));
jest.mock('@/components/DataManagement', () => ({
  DataManagement: () => <div>Data Management</div>
}));
jest.mock('@/components/InvitationManagement', () => ({
  InvitationManagement: () => <div>Invitation Management</div>
}));
jest.mock('@/components/ProtectedRoute', () => ({
  ProtectedRoute: ({ children, requireAdmin }: any) => {
    const { useAuth } = require('@/contexts/AuthContext');
    const { useRouter } = require('next/navigation');
    const router = useRouter();
    const { user, loading } = useAuth();

    if (loading) return <div>Loading...</div>;
    if (!user) {
      router.push('/login');
      return null;
    }
    if (requireAdmin && !user.is_admin) {
      router.push('/dashboard');
      return null;
    }
    return <>{children}</>;
  }
}));

const mockApiService = apiService as jest.Mocked<typeof apiService>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

describe('AdminPage', () => {
  const mockUsers = [
    {
      id: 1,
      username: 'admin',
      email: 'admin@example.com',
      is_admin: true,
      is_active: true,
      created_at: '2024-01-01T00:00:00',
    },
    {
      id: 2,
      username: 'testuser',
      email: 'test@example.com',
      is_admin: false,
      is_active: true,
      created_at: '2024-01-02T00:00:00',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: 1, username: 'admin', is_admin: true },
      token: 'test-token',
      loading: false,
    } as any);
    mockApiService.getUsers.mockResolvedValue(mockUsers);
  });

  describe('Page Rendering and Routing', () => {
    it('should render the admin page when user is admin', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('👥 User Management')).toBeInTheDocument();
      });

      expect(screen.getByText('All Users (2)')).toBeInTheDocument();
      expect(screen.getByText('admin')).toBeInTheDocument();
      expect(screen.getByText('testuser')).toBeInTheDocument();
    });

    it('should redirect to dashboard when user is not admin', () => {
      mockUseAuth.mockReturnValue({
        user: { id: 2, username: 'testuser', is_admin: false },
        token: 'test-token',
        loading: false,
      } as any);

      render(<AdminPage />);

      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    it('should redirect to login when user is not authenticated', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        loading: false,
      } as any);

      render(<AdminPage />);

      expect(mockPush).toHaveBeenCalledWith('/login');
    });

    it('should handle loading state', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        token: null,
        loading: true,
      } as any);

      render(<AdminPage />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('API Endpoint Integration', () => {
    it('should call getUsers API on mount', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(mockApiService.getUsers).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle API errors gracefully', async () => {
      mockApiService.getUsers.mockRejectedValue(new Error('API Error'));

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Failed to load users')).toBeInTheDocument();
      });
    });

    it('should display loading state while fetching users', () => {
      mockApiService.getUsers.mockImplementation(() => new Promise(() => {}));

      render(<AdminPage />);

      expect(screen.getByText('Loading users...')).toBeInTheDocument();
    });
  });

  describe('User Creation', () => {
    it('should open create user form when button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create User'));

      expect(screen.getByText('Create New User')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();
    });

    it('should create user and refresh list on form submission', async () => {
      const user = userEvent.setup();
      mockApiService.createUserByAdmin.mockResolvedValue({} as any);

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('+ Create User')).toBeInTheDocument();
      });

      await user.click(screen.getByText('+ Create User'));

      await user.type(screen.getByLabelText('Username'), 'newuser');
      await user.type(screen.getByLabelText('Email'), 'new@example.com');
      await user.type(screen.getByLabelText('Password'), 'password123');

      await user.click(screen.getByRole('button', { name: 'Create User' }));

      await waitFor(() => {
        expect(mockApiService.createUserByAdmin).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123',
          is_admin: false,
          send_invitation: false,
        });
        expect(mockApiService.getUsers).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('User Editing', () => {
    it('should open edit form when Edit button is clicked', async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Edit')[0]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Edit')[0]);

      expect(screen.getByText('Edit User')).toBeInTheDocument();
      expect(screen.getByDisplayValue('admin')).toBeInTheDocument();
      expect(screen.getByDisplayValue('admin@example.com')).toBeInTheDocument();
    });

    it('should update user on form submission', async () => {
      const user = userEvent.setup();
      mockApiService.updateUser.mockResolvedValue({} as any);

      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Edit')[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Edit')[1]);

      const emailInput = screen.getByDisplayValue('test@example.com');
      await user.clear(emailInput);
      await user.type(emailInput, 'updated@example.com');

      await user.click(screen.getByRole('button', { name: 'Update User' }));

      await waitFor(() => {
        expect(mockApiService.updateUser).toHaveBeenCalledWith(2, {
          username: 'testuser',
          email: 'updated@example.com',
          is_admin: false,
          is_active: true,
        });
        expect(mockApiService.getUsers).toHaveBeenCalledTimes(2);
      });
    });

    it('should show warning when disabling user account', async () => {
      const user = userEvent.setup();
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getAllByText('Edit')[1]).toBeInTheDocument();
      });

      await user.click(screen.getAllByText('Edit')[1]);

      const activeCheckbox = screen.getByLabelText('Active Account');
      await user.click(activeCheckbox);

      expect(screen.getByText(/Disabling this account will prevent the user from logging in/)).toBeInTheDocument();
    });
  });

  describe('Components Integration', () => {
    it('should render all management sections', async () => {
      render(<AdminPage />);

      await waitFor(() => {
        expect(screen.getByText('Header')).toBeInTheDocument();
        expect(screen.getByText('Invitation Management')).toBeInTheDocument();
        expect(screen.getByText('Data Management')).toBeInTheDocument();
      });
    });
  });
});
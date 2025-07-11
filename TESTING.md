# Testing Guide - Car Collection Management Application

## Overview

This guide covers the testing strategy, test organization, and instructions for running tests in the Car Collection Management Application.

## Test Coverage Status

**Current Coverage: 7/10** (Improved from 6/10 as of January 11, 2025)

### What's Well Tested ✅
- Frontend Components (CalculatorInput, ServiceEntryDialog, ServiceHistoryTable, etc.)
- Backend authentication flows and JWT tokens
- Basic CRUD operations for all models
- Multi-tenancy isolation
- Admin routing and access control (NEW)
- Nginx routing configuration (NEW)

### Critical Gaps 🚨
- Business logic tests (summary line items, cost calculations)
- Missing component tests (CarForm, modals, auth components)
- No E2E tests for complete user flows
- Limited API error handling tests

## Test Organization

### Frontend Tests (`car-collection-prototype/__tests__/`)

```
__tests__/
├── app/
│   └── admin/
│       └── page.test.tsx         # Admin page component tests
├── components/
│   ├── CalculatorInput.test.tsx  # Calculator input tests
│   ├── ServiceEntryDialog.test.tsx
│   └── ServiceHistoryTable.test.tsx
└── integration/
    └── admin-routing.test.ts      # Nginx routing simulation tests
```

### Backend Tests (`backend/app/tests/`)

```
app/tests/
├── test_admin_routes.py           # Admin API endpoint tests
├── test_auth.py                   # Authentication tests
├── test_cars.py                   # Car CRUD tests
├── test_todos.py                  # Todo CRUD tests
├── test_service_intervals.py      # Service interval tests
├── test_service_history_cost_breakdown.py
├── test_user_management.py
└── test_password_change.py
```

## Running Tests

### Frontend Tests

```bash
cd car-collection-prototype

# Run all tests
npm test

# Run specific test file
npm test -- __tests__/app/admin/page.test.tsx

# Run tests in watch mode
npm test -- --watch

# Run with coverage
npm test -- --coverage

# Run integration tests only
npm test -- __tests__/integration/
```

### Backend Tests

```bash
cd backend
source venv/bin/activate  # Activate virtual environment

# Run all tests
python -m pytest

# Run specific test file
python -m pytest app/tests/test_admin_routes.py

# Run with verbose output
python -m pytest -v

# Run with coverage
python -m pytest --cov=app

# Run specific test class or method
python -m pytest app/tests/test_admin_routes.py::TestAdminRoutes::test_admin_users_endpoint_success
```

### Pre-deployment Testing

Before deploying, run the routing verification script:

```bash
cd deployment
./pre-deploy-routing-test.sh
```

This script will:
- Verify frontend and backend are running
- Test all critical routes
- Validate nginx configuration
- Prevent deployment if tests fail

## Key Test Files

### 1. Admin Page Tests (`__tests__/app/admin/page.test.tsx`)
Tests the admin page component including:
- Authentication and authorization
- User list rendering
- Create/edit user functionality
- Component integration

### 2. Admin Routes Tests (`backend/app/tests/test_admin_routes.py`)
Tests backend admin endpoints:
- Authentication requirements
- Admin-only access control
- User CRUD operations
- Security (SQL injection, XSS prevention)
- Ensures `/admin` and `/admin/` return 404 (frontend routes)

### 3. Routing Integration Tests (`__tests__/integration/admin-routing.test.ts`)
Simulates nginx routing behavior:
- Documents which routes go to frontend vs backend
- Tests edge cases and special routing rules
- Prevents configuration mismatches

## Writing New Tests

### Frontend Test Template

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentName } from '@/components/ComponentName';

// Mock dependencies
jest.mock('@/lib/api');

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render correctly', () => {
    render(<ComponentName />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    const user = userEvent.setup();
    render(<ComponentName />);
    
    await user.click(screen.getByRole('button'));
    
    await waitFor(() => {
      expect(screen.getByText('Result')).toBeInTheDocument();
    });
  });
});
```

### Backend Test Template

```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

class TestFeatureName:
    def test_endpoint_requires_auth(self, client: TestClient):
        """Test that endpoint requires authentication."""
        response = client.get("/api/endpoint")
        assert response.status_code == 401
        
    def test_successful_operation(self, client: TestClient, auth_headers: dict):
        """Test successful operation with auth."""
        response = client.get("/api/endpoint", headers=auth_headers)
        assert response.status_code == 200
        assert "expected_field" in response.json()
```

## Testing Best Practices

### 1. Test Naming
- Use descriptive names that explain what is being tested
- Follow pattern: `test_<what>_<condition>_<expected_result>`
- Example: `test_admin_users_endpoint_requires_auth`

### 2. Test Organization
- Group related tests in describe blocks (frontend) or classes (backend)
- Use clear setup and teardown
- Keep tests independent - no shared state

### 3. Mock External Dependencies
- Mock API calls in frontend tests
- Use test database for backend tests
- Mock external services (email, etc.)

### 4. Test Coverage Goals
- Aim for 80% code coverage minimum
- 100% coverage for critical business logic
- Focus on behavior, not implementation

### 5. Continuous Integration
- All tests must pass before merging
- Run tests automatically on pull requests
- Fix failing tests immediately

## Common Testing Scenarios

### Testing Protected Routes
```typescript
// Frontend
it('should redirect to login when not authenticated', () => {
  mockUseAuth.mockReturnValue({ user: null, loading: false });
  render(<ProtectedComponent />);
  expect(mockPush).toHaveBeenCalledWith('/login');
});
```

```python
# Backend
def test_endpoint_requires_auth(client):
    response = client.get("/protected")
    assert response.status_code == 401
```

### Testing Admin-Only Features
```typescript
// Frontend
it('should redirect non-admin users', () => {
  mockUseAuth.mockReturnValue({ 
    user: { is_admin: false }, 
    loading: false 
  });
  render(<AdminComponent />);
  expect(mockPush).toHaveBeenCalledWith('/dashboard');
});
```

```python
# Backend
def test_admin_endpoint_requires_admin(client, user_token):
    response = client.get("/admin/users/", 
                         headers={"Authorization": f"Bearer {user_token}"})
    assert response.status_code == 403
```

### Testing Error Handling
```typescript
// Frontend
it('should handle API errors gracefully', async () => {
  mockApiService.getData.mockRejectedValue(new Error('API Error'));
  render(<Component />);
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

## Debugging Tests

### Frontend Tests
- Use `screen.debug()` to see current DOM
- Check mock calls with `expect(mockFn).toHaveBeenCalledWith(...)`
- Use `waitFor` for async operations

### Backend Tests
- Add `-s` flag to see print statements: `pytest -s`
- Use `--pdb` to drop into debugger on failure
- Check response content: `print(response.json())`

## Test Data Management

### Frontend
- Use factories or fixtures for consistent test data
- Reset mocks between tests
- Don't rely on test execution order

### Backend
- Use fresh database for each test
- Create test fixtures for common data
- Clean up after tests

## Future Testing Improvements

### Phase 1: Critical Business Logic (HIGH PRIORITY)
1. Summary line item creation tests
2. Cost calculation and validation tests
3. Service progress calculation tests
4. Overdue detection tests

### Phase 2: Component Coverage
1. CarForm component tests
2. Modal components tests
3. Auth flow integration tests
4. Error boundary tests

### Phase 3: E2E Testing
1. Complete user journey tests
2. Multi-user collaboration tests
3. Performance tests with large datasets
4. Cross-browser compatibility

### Phase 4: Advanced Testing
1. Visual regression tests
2. Accessibility (a11y) tests
3. Security penetration tests
4. Load and stress testing

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Pytest Documentation](https://docs.pytest.org/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

**Last Updated**: January 11, 2025
**Version**: 1.0
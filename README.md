# Car Collection Management Application

A modern, full-stack web application for managing car collections with maintenance tracking, issue management, fuel mileage tracking, and trip journaling.

## 🚗 Features

### Core Features
- **Car Management**: Add, edit, and organize your car collection
- **Issue Tracking**: Per-car to-do lists with due dates and reminders
- **Maintenance Tracking**: Oil changes, annual service, and major service scheduling
- **Fuel Mileage Tracking**: Log fuel stops and track MPG over time
- **Trip Journal**: Document trips with routes, destinations, and memories
- **Photo Gallery**: Store and organize car photos and documents
- **Notifications**: SMS/Telegram integration for reminders and quick entry

### Planned Features
- **Repair History**: Track repair costs and service history
- **Document Management**: Store insurance, registration, and receipts
- **Mobile App**: Progressive Web App for mobile access
- **Analytics**: Cost analysis and maintenance insights

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Shadcn/ui** - Modern UI components
- **Lucide React** - Beautiful icons

### Backend (Planned)
- **Python** - Primary backend language
- **FastAPI** - Modern, fast web framework
- **SQLAlchemy** - Database ORM
- **PostgreSQL** - Primary database
- **SQLite** - Development database

### Integrations (Planned)
- **Telegram Bot API** - Mobile notifications and entry
- **Twilio** - SMS notifications
- **File Storage** - Local/cloud file management

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Python 3.8+ (for backend)

### Frontend Development
```bash
# Navigate to the prototype directory
cd car-collection-prototype

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

### Backend Development (Coming Soon)
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run development server
uvicorn main:app --reload
```

## 📁 Project Structure

```
CarCollection/
├── car-collection-prototype/     # Next.js frontend
│   ├── src/
│   │   ├── app/                 # App Router pages
│   │   ├── components/          # React components
│   │   └── lib/                 # Utilities
│   ├── public/                  # Static assets
│   └── package.json
├── backend/                     # Python backend (planned)
├── docs/                        # Documentation
├── README.md                    # This file
├── PLANNING.md                  # Architecture and design decisions
└── TASK.md                      # Development tasks and progress
```

## 🎨 Design System

- **Colors**: Modern automotive-inspired palette
- **Typography**: Clean, readable fonts with proper hierarchy
- **Layout**: Card-based design with smooth animations
- **Responsive**: Mobile-first design approach

## 🧪 Testing

The application includes comprehensive test coverage for both frontend and backend components. See [TESTING.md](TESTING.md) for detailed testing documentation.

### Quick Start - Running Tests

**Frontend Tests:**
```bash
cd car-collection-prototype
npm test                    # Run all tests
npm test -- --coverage      # Run with coverage report
npm test -- --watch         # Run in watch mode
```

**Backend Tests:**
```bash
cd backend
source venv/bin/activate    # Activate virtual environment
python -m pytest            # Run all tests
python -m pytest -v         # Run with verbose output
```

**Pre-deployment Testing:**
```bash
cd deployment
./pre-deploy-routing-test.sh  # Verify routing before deployment
```

### Test Coverage

Current coverage: **7/10** - Includes unit tests, integration tests, and routing verification.

Key test areas:
- Component unit tests
- API endpoint security
- Admin routing configuration
- Authentication flows
- Multi-tenancy isolation

## 🔧 Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages
- Add JSDoc comments for complex functions

### Testing
- Unit tests for all components and utilities
- Integration tests for API endpoints
- E2E tests for critical user flows

### Git Workflow
- Feature branches for new development
- Pull requests for code review
- Semantic versioning for releases

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Support

For questions or support, please open an issue on GitHub or contact the development team.

---

**Status**: 🚧 In Development - Frontend prototype complete, backend planning phase # CarCollection

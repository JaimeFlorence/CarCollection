# Car Collection Management Application - Planning & Architecture

## 🏗️ System Architecture

### High-Level Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Email Service │
│ • Car Details   │    │ • Database      │    │ • File Storage  │
│ • Mobile PWA    │    │ • Auth System   │    │ • SMS (Future)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 Multi-Tenancy & Authentication

### Multi-Tenancy Architecture ✅ DECIDED
**Status**: High Priority - Implementation planned
**Approach**: Database-level tenant isolation with user_id foreign keys
**Benefits**: 
- Each user has their own isolated car collection
- Secure data separation
- Scalable architecture
- Easy to implement now vs. later

### Authentication System ✅ DECIDED
**Status**: Simple username/password with session tokens (preferred)
**Features**:
- Admin user creation for others
- Email invitations for new users
- Session-based authentication
- Password hashing with bcrypt
- JWT tokens for API access

### User Management ✅ DECIDED
**Status**: Hybrid approach - Admin creation + Email invitations
**Features**:
- Admins can create accounts for others
- Email invitations sent to new users
- User activation via email link
- Role-based access control (Admin/User)

### Authentication Methods Summary

#### 1. Simple (Username/Password + Session) ✅ CHOSEN
**Pros**:
- Easy to implement and maintain
- Familiar to users
- Full control over authentication flow
- No external dependencies
- Works offline

**Cons**:
- Users need to remember another password
- Need to handle password reset flows
- Security depends on password strength

**Implementation**:
- FastAPI with session middleware
- bcrypt for password hashing
- JWT tokens for API authentication
- Email verification for new accounts

#### 2. OAuth (GitHub, Google, etc.)
**Pros**:
- No password management
- Users trust familiar providers
- Enhanced security
- Quick sign-up process

**Cons**:
- External dependency on OAuth providers
- More complex implementation
- Requires app registration with providers
- Potential privacy concerns

#### 3. JWT-Only Authentication
**Pros**:
- Stateless authentication
- Good for microservices
- No server-side session storage

**Cons**:
- More complex token management
- Harder to implement logout
- Security considerations with token storage

#### 4. Third-party Auth (Auth0, Firebase)
**Pros**:
- Feature-rich authentication
- Built-in security features
- Easy to implement

**Cons**:
- Vendor lock-in
- Monthly costs
- Less control over user data

## 📊 Data Models

### Core Entities

#### User (NEW - Multi-tenancy)
```typescript
interface User {
  id: string;
  username: string;
  email: string;
  hashed_password: string;
  is_active: boolean;
  is_admin: boolean;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}
```

#### Car (UPDATED - Multi-tenancy)
```typescript
interface Car {
  id: string;
  user_id: string;  // NEW - Multi-tenancy
  year: number;
  make: string;
  model: string;
  vin: string;
  mileage: number;
  color: string;
  engine: string;
  license_plate: string;
  insurance_info: string;
  notes: string;
  created_at: Date;
  updated_at: Date;
}
```

#### Issue (UPDATED - Multi-tenancy)
```typescript
interface Issue {
  id: string;
  user_id: string;  // NEW - Multi-tenancy
  car_id: string;
  title: string;
  description: string;
  status: 'open' | 'resolved';
  priority: 'low' | 'medium' | 'high';
  due_date?: Date;
  created_at: Date;
  resolved_at?: Date;
}
```

#### MaintenanceEvent
```typescript
interface MaintenanceEvent {
  id: string;
  carId: string;
  type: 'oil_change' | 'annual_service' | 'major_service' | 'custom';
  title: string;
  description: string;
  date: Date;
  mileage: number;
  cost?: number;
  nextDueDate?: Date;
  nextDueMileage?: number;
  intervalMonths?: number;
  intervalMiles?: number;
}
```

#### FuelEntry
```typescript
interface FuelEntry {
  id: string;
  carId: string;
  date: Date;
  gallons: number;
  mileage: number;
  cost?: number;
  notes?: string;
  mpg?: number;
}
```

#### Trip
```typescript
interface Trip {
  id: string;
  carId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  startMileage: number;
  endMileage: number;
  destination: string;
  route: string;
  notes: string;
  photos: string[];
  totalCost?: number;
}
```

#### Document
```typescript
interface Document {
  id: string;
  carId?: string;
  type: 'photo' | 'receipt' | 'insurance' | 'registration' | 'other';
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
  description?: string;
}
```

## 🎨 UI/UX Design Principles

### Design System
- **Color Palette**: Automotive-inspired (deep blues, metallic grays, accent colors)
- **Typography**: Clean, readable fonts with proper hierarchy
- **Layout**: Card-based design with smooth animations
- **Responsive**: Mobile-first approach

### Component Architecture
```
src/
├── components/
│   ├── ui/                    # Shadcn/ui components
│   ├── layout/               # Layout components
│   ├── car/                  # Car-specific components
│   ├── maintenance/          # Maintenance components
│   ├── fuel/                 # Fuel tracking components
│   └── trips/                # Trip journal components
```

### Page Structure
- **Dashboard**: Overview of all cars with quick stats
- **Car Detail**: Tabbed interface for each car's information
- **Add/Edit Car**: Form for car information
- **Maintenance Calendar**: Visual timeline of service needs
- **Reports**: Analytics and insights

## 🔧 Technical Decisions

### Frontend Framework: Next.js 15
**Rationale**: 
- Modern React framework with excellent developer experience
- Built-in TypeScript support
- App Router for better routing and layouts
- Server-side rendering capabilities
- Excellent performance and SEO

### UI Library: Shadcn/ui + Tailwind CSS
**Rationale**:
- Modern, accessible components
- Highly customizable
- Consistent design system
- Excellent developer experience
- No vendor lock-in

### Backend Framework: FastAPI ✅ IMPLEMENTED
**Rationale**:
- Modern Python web framework
- Automatic API documentation
- Type hints and validation
- Excellent performance
- Easy to learn and use

### Database: SQLite (Development) + PostgreSQL (Production) ✅ DECIDED
**Rationale**:
- SQLite for development (simple, file-based, no setup required)
- PostgreSQL for production (robust, production-ready, recommended for multi-tenancy)
- SQLAlchemy ORM for type-safe database operations
- Migration support for schema changes
- Easy data export/import with CSV files

### Deployment: Linux VPS (Hostinger) ✅ DECIDED
**Rationale**:
- User has existing VPS infrastructure
- Full control over server configuration
- Cost-effective for small to medium scale
- Can scale up as needed
- Familiar environment for user

### File Storage: Local + Cloud (Planned)
**Rationale**:
- Local storage for development
- Cloud storage (AWS S3) for production
- Flexible storage strategy
- Cost-effective for different use cases

### Data Management: CSV Export/Import System ✅ IMPLEMENTED
**Rationale**:
- Easy data backup and restoration
- Efficient testing with sample data
- Manual data entry via spreadsheet editors
- Version control for test data
- Automatic schema adaptation

### Authentication: Simple Session-Based ✅ DECIDED
**Rationale**:
- Easy to implement and maintain
- Full control over authentication flow
- No external dependencies
- Works well with VPS deployment
- Familiar to users

## 🔌 API Design

### RESTful Endpoints
```
GET    /api/cars              # List all cars
POST   /api/cars              # Create new car
GET    /api/cars/{id}         # Get car details
PUT    /api/cars/{id}         # Update car
DELETE /api/cars/{id}         # Delete car

GET    /api/cars/{id}/issues  # Get car issues
POST   /api/cars/{id}/issues  # Create issue
PUT    /api/issues/{id}       # Update issue

GET    /api/cars/{id}/maintenance  # Get maintenance history
POST   /api/cars/{id}/maintenance  # Log maintenance

GET    /api/cars/{id}/fuel    # Get fuel entries
POST   /api/cars/{id}/fuel    # Log fuel entry

GET    /api/cars/{id}/trips   # Get trips
POST   /api/cars/{id}/trips   # Create trip

GET    /api/cars/{id}/photos  # Get photos
POST   /api/cars/{id}/photos  # Upload photo
```

### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Secure file uploads
- API rate limiting

## 📱 Mobile Strategy

### Progressive Web App (PWA)
- Installable from browser
- Offline capabilities
- Push notifications
- Native app-like experience

### Telegram Bot Integration
- Quick entry of issues and fuel
- Maintenance reminders
- Trip logging
- Photo uploads

## 🔒 Security Considerations

### Data Protection
- Encrypted data transmission (HTTPS)
- Secure file uploads
- Input validation and sanitization
- SQL injection prevention

### Authentication
- Secure password hashing
- JWT token management
- Session management
- Rate limiting

### File Security
- File type validation
- Virus scanning
- Secure file storage
- Access control

## 📈 Performance Considerations

### Frontend
- Code splitting and lazy loading
- Image optimization
- Caching strategies
- Bundle size optimization

### Backend
- Database query optimization
- Caching (Redis)
- CDN for static assets
- API response optimization

## 🧪 Testing Strategy

### Frontend Testing
- Unit tests for components
- Integration tests for pages
- E2E tests for critical flows
- Visual regression testing

### Backend Testing
- Unit tests for business logic
- Integration tests for API endpoints
- Database migration testing
- Performance testing

## 🚀 Deployment Strategy

### Development
- Local development with hot reload
- Docker containers for consistency
- Environment-specific configurations

### Production
- Containerized deployment
- Load balancing
- Database backups
- Monitoring and logging

## 📋 Development Phases

### Phase 1: Frontend Foundation ✅
- [x] Next.js project setup
- [x] UI component library
- [x] Basic dashboard
- [x] Car cards and layout

### Phase 2: Backend Foundation ✅
- [x] FastAPI backend setup
- [x] SQLite database with SQLAlchemy ORM
- [x] Car and ToDo models and schemas
- [x] RESTful API endpoints
- [x] Comprehensive unit tests
- [x] Data export/import system

### Phase 3: Core Features ✅
- [x] Car management (CRUD)
- [x] Issue tracking (To-Dos)
- [x] Car detail pages with tabbed interface
- [x] Frontend-backend integration
- [x] Form validation and error handling

### Phase 4: Advanced Features
- [ ] Maintenance tracking
- [ ] Fuel mileage tracking
- [ ] Trip journal
- [ ] Photo gallery
- [ ] Document management
- [ ] Analytics and reports

### Phase 5: Integrations & File Storage
- [ ] File upload system
- [ ] Cloud storage integration
- [ ] Image processing
- [ ] Document management

### Phase 6: Mobile & Notifications
- [ ] PWA implementation
- [ ] Telegram bot
- [ ] SMS notifications
- [ ] Mobile optimization

### Phase 7: Production
- [ ] Deployment setup
- [ ] Performance optimization
- [ ] Security hardening
- [ ] Monitoring and logging

---

**Last Updated**: July 5, 2024
**Version**: 1.1.0 
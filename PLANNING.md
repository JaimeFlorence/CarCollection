# Car Collection Management Application - Planning & Architecture

## 🏗️ System Architecture

### High-Level Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   External      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • REST API      │    │ • Research API  │
│ • Car Details   │    │ • Database      │    │ • Email Service │
│ • Service Mgmt  │    │ • Auth System   │    │ • VIN Decoder   │
│ • Mobile PWA    │    │ • Research Eng. │    │ • File Storage  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔐 Multi-Tenancy & Authentication ✅ IMPLEMENTED

### Multi-Tenancy Architecture 
**Status**: COMPLETED (July 7, 2024)
**Approach**: Database-level tenant isolation with user_id foreign keys
**Implementation**: 
- Each user has their own isolated car collection
- All queries filtered by authenticated user
- Secure data separation at database level
- Service intervals and history are user-specific

### Authentication System
**Status**: IMPLEMENTED - Simple username/password with JWT tokens
**Features**:
- User registration and login
- Password hashing with bcrypt
- JWT tokens for API access
- Protected routes and endpoints
- Session persistence with localStorage

### User Management
**Status**: Partially implemented
**Completed**:
- Admin user creation
- User registration flow
- Role-based access (Admin/User)

**Pending**:
- Email invitations
- Password reset functionality
- Email verification

## 🛠️ Service Intervals System ✅ ENHANCED (January 9, 2025)

### Core Features Implemented
1. **Database Models**
   - ServiceInterval: Stores maintenance schedules
   - ServiceHistory: Tracks completed services
   - ServiceResearchLog: Audit trail for research

2. **Research Engine**
   - Real manufacturer data for 15+ brands
   - Engine type support (gas/diesel/hybrid)
   - Confidence scoring system
   - Default intervals for unknown vehicles

3. **User Interface**
   - Service Schedule tab with progress visualization
   - Real-time progress bars based on service history
   - "Mark Done" functionality
   - Edit/Delete/Add intervals
   - Engine type selection dialog

4. **Engine Type Handling** (NEW)
   - Smart detection for vehicles with engine variants
   - Modal dialog for user selection
   - Diesel-specific intervals (DEF, fuel filters, EGR)
   - Different oil specifications and capacities

### Technical Implementation

#### Backend Architecture
```python
# Service Research Flow
1. User clicks "Research Intervals"
2. Frontend checks if engine type needed
3. If yes, shows EngineTypeDialog
4. API call: POST /api/cars/{id}/research-intervals?engine_type=diesel
5. Backend queries manufacturer database
6. Returns engine-specific intervals
7. User reviews and saves intervals
```

#### Progress Calculation
```javascript
// Real-time progress based on service history
1. Load service history from API
2. Find most recent service for each interval
3. Calculate progress:
   - By miles: (current_miles - service_miles) / interval_miles
   - By time: (current_date - service_date) / interval_months
   - Use higher of the two values
4. Update status: ok (0-74%), due_soon (75-99%), overdue (100%+)
```

### Recently Fixed
- Date display bug: FIXED - "Done today" now displays correctly

## 📦 Technology Stack

### Frontend
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: Shadcn/ui + Custom components
- **State Management**: React hooks + API service pattern
- **Testing**: Jest + React Testing Library

### Backend
- **Framework**: FastAPI
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **ORM**: SQLAlchemy 2.0
- **Authentication**: JWT tokens
- **Testing**: Pytest
- **Documentation**: OpenAPI/Swagger

### Infrastructure
- **Development**: Local development
- **Production**: Linux VPS (planned)
- **Database**: PostgreSQL (production)
- **File Storage**: Local (dev) / S3 (prod planned)

## 🚀 Deployment Strategy

### Development Environment
- Frontend: `npm run dev` (port 3000)
- Backend: `uvicorn app.main:app --reload` (port 8000)
- Database: SQLite file

### Production Environment (Planned)
- **Hosting**: Hostinger VPS (Ubuntu)
- **Frontend**: Next.js production build
- **Backend**: Gunicorn + Uvicorn workers
- **Database**: PostgreSQL 15+
- **Reverse Proxy**: Nginx
- **SSL**: Let's Encrypt
- **Process Manager**: systemd

## 📊 Database Design

### Core Tables (Implemented)
```sql
-- Users (multi-tenancy root)
users: id, username, email, password_hash, is_admin, created_at

-- Cars (user-isolated)
cars: id, user_id, make, model, year, vin, mileage, group_name

-- Service Intervals (user-isolated)
service_intervals: id, user_id, car_id, service_item, interval_miles, 
                  interval_months, priority, cost_estimates, source

-- Service History (user-isolated)
service_history: id, user_id, car_id, service_item, performed_date,
                mileage, cost, notes, next_due_date

-- ToDos (user-isolated)
todos: id, user_id, car_id, title, description, priority, status
```

## 🔮 Future Enhancements

### Phase 1: Core Improvements
- [x] Fix date display bug ✅ FIXED
- [ ] Add mileage update when marking service done
- [ ] Service history export (CSV/PDF)
- [ ] Email notifications for due services
- [ ] Mobile app improvements

### Phase 2: Advanced Features
- [ ] VIN decoder integration
- [ ] OBD-II real-time data
- [ ] Service provider directory
- [ ] Cost analytics dashboard
- [ ] Predictive maintenance AI

### Phase 3: Community Features
- [ ] Service interval sharing
- [ ] Make/model forums
- [ ] DIY guides integration
- [ ] Part number database
- [ ] Group fleet management

## 🏃 Quick Start Guide

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python init_db.py
python create_admin.py
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd car-collection-prototype
npm install
npm run dev
```

### Default Credentials
- Admin: `admin` / `admin123`
- Test User: `jaime` / `testing1`

## 📝 Session Notes (January 9, 2025)

### Completed Today
1. Fixed service history API integration
2. Implemented real progress calculation
3. Added engine type selection for diesel/gas
4. Enhanced research API with real manufacturer data
5. Created comprehensive test scripts
6. Reset database for clean testing

### Next Steps
1. Add current mileage input when marking service done
2. Implement service history view/export
3. Add more engine type variants (hybrid, electric)
4. Create dashboard with upcoming services
5. Add email notifications for due services

### Key Files Modified
- `ServiceIntervalList.tsx` - Real progress calculation
- `service_research.py` - Engine type support
- `EngineTypeDialog.tsx` - New component
- `service_api.py` - Engine type parameter
- Database reset with clean data

## 📋 Service History System (Planned - January 2025)

### Overview
Comprehensive service record tracking system that integrates with Service Schedule for streamlined maintenance management.

### Core Features Design

#### 1. Service History Table View
**Layout:** Table with columns: Date | Mileage | Shop | Summary | Cost
**Functionality:**
- Group multiple service items by date into single record
- Sort by date, shop, or cost
- Filter by date range, shop, cost range
- Summary stats: Total services, total cost, average cost

#### 2. Service Entry Dialog
**Unified Add/Edit Interface:**
- Date, mileage, shop, invoice # fields
- Service Schedule integration with checkboxes
- Multiple service items per date
- Cost entry updates Service Schedule estimates
- Notes and attachments support

#### 3. Service Schedule Integration
**Workflow:**
1. User selects items in Service Schedule (checkboxes)
2. Clicks "Record Service" button
3. Dialog opens with selected items pre-checked
4. User adds costs, shop info, notes
5. Save updates both Service History and Schedule progress

### Implementation Phases

#### Phase 1: Core Functionality
1. **Step 1:** Database schema updates (add shop, invoice_number)
2. **Step 2:** Basic Service History tab (read-only table)
3. **Step 3:** Service entry dialog (manual entry)
4. **Step 4:** Service Schedule integration
5. **Step 5:** Edit/delete functionality
6. **Step 6:** Date grouping and summary stats

#### Phase 2: Analytics & Documentation
- Cost analysis dashboard
- Cost vs mileage trends
- Document storage (photos, PDFs)
- Anonymous data collection for trends

#### Phase 3: Advanced Features (Future)
- SMS/Telegram receipt upload
- OCR for automatic data extraction
- Calendar integration
- Parts tracking
- Fleet dashboard

### Technical Architecture

#### Backend Changes
```python
# ServiceHistory model additions
shop = Column(String)
invoice_number = Column(String)
service_items = relationship("ServiceHistoryItem")

# New ServiceHistoryItem model
service_history_id = ForeignKey
service_interval_id = ForeignKey  # Links to schedule
actual_cost = Column(Float)
```

#### API Endpoints
- GET /api/cars/{id}/service-history (enhanced with grouping)
- POST /api/cars/{id}/service-history (enhanced with items)
- PUT /api/service-history/{id}
- DELETE /api/service-history/{id}

### Data Collection Strategy
Anonymous service data for industry trends:
- Vehicle make/model/year/mileage range
- Service type and cost
- Geographic region
- No personally identifiable information

---

**Last Updated**: January 9, 2025
**Version**: 2.1 (Service History System Planned)
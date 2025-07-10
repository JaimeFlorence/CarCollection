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

4. **Engine Type Handling**
   - Smart detection for vehicles with engine variants
   - Modal dialog for user selection
   - Diesel-specific intervals (DEF, fuel filters, EGR)
   - Different oil specifications and capacities

5. **Service History Integration** ✅ (January 9, 2025)
   - Service Entry Dialog with individual cost tracking
   - Service Schedule checkboxes link to service history
   - Automatic progress reset when services are recorded
   - Individual cost entry for each service item
   - Support for invoice totals that don't match item sum

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

### Recently Fixed (January 9-10, 2025)
- Date display bug: FIXED - "Done today" now displays correctly
- Service History integration: FIXED - Removed duplicate dialogs, fixed API calls
- Cost double-counting: FIXED - Individual cost entry per service item
- Service progress reset: FIXED - Correctly updates when services recorded
- ServiceEntryDialog JSX syntax error: FIXED - Corrected mismatched parentheses
- Multi-service submission: FIXED - Added error handling and logging for debugging
- Service update checkbox bug: FIXED - Now properly saves new services when updating
- Service interval pre-selection: FIXED - Checkboxes now pre-populate when editing

### New Features (January 10, 2025)
- **CalculatorInput Component**: IMPLEMENTED - Allows math expressions in cost fields
  - Enter formulas like "=27.15+13.95" in any cost field
  - Automatically calculates on blur/tab
  - Shows calculator icon when formula is stored
  - Safe evaluation (no eval()) using Shunting Yard algorithm
  - Known issue: Formula recall on focus not working in ServiceEntryDialog context
  
- **Enhanced Cost Tracking**: IMPLEMENTED - Parts/Labor/Tax breakdown
  - Added parts_cost, labor_cost, tax fields to database
  - Cost breakdown section in ServiceEntryDialog
  - Validation ensures breakdown matches total (if provided)
  - Service History table shows breakdown under total cost
  - All fields support CalculatorInput for easy math

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
- [x] Service History with individual cost tracking ✅ IMPLEMENTED
- [x] Service Schedule integration ✅ IMPLEMENTED
- [ ] Parts/Labor/Tax breakdown for service costs
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

## 📝 Session Notes 

### January 9, 2025
1. Fixed service history API integration
2. Implemented real progress calculation
3. Added engine type selection for diesel/gas
4. Enhanced research API with real manufacturer data
5. Created comprehensive test scripts
6. Reset database for clean testing

### January 10, 2025
1. Fixed ServiceEntryDialog JSX syntax error (mismatched parentheses)
2. Enhanced multi-service submission with detailed logging
3. Fixed service update bug - checkboxes now save properly
4. Added pre-selection of related services when editing
5. Added VIN field to car creation/edit forms
6. Verified multi-tenancy isolation is working correctly
7. Created data export script for test data preservation
8. Fixed all critical bugs in service history system

### Next Steps
1. Fix CalculatorInput formula recall issue (deferred - low priority)
2. Add current mileage input when marking service done
3. Implement service history export (CSV/PDF)
4. Create dashboard with upcoming services widget
5. Add email notifications for due services
6. Implement VIN decoder integration
7. Add receipt/photo attachments to service records
8. Write tests for Enhanced Cost Tracking feature

### Key Files Modified (January 10)
- `ServiceEntryDialog.tsx` - Fixed syntax, added checkbox pre-selection, added cost breakdown fields
- `cars/[id]/page.tsx` - Enhanced update logic for multiple services
- `ServiceIntervalList.tsx` - Removed debug logging
- `CarForm.tsx` - Added VIN input field
- `api.ts` - Added VIN to Car and CarCreate interfaces, added cost breakdown fields
- `export_all_data.py` - Created comprehensive data export script
- `CalculatorInput.tsx` - NEW - Calculator-enabled input component
- `models.py` - Added parts_cost, labor_cost, tax fields to ServiceHistory
- `schemas.py` - Updated ServiceHistory schemas with new fields
- `ServiceHistoryTable.tsx` - Shows cost breakdown when available
- `add_cost_breakdown_columns.py` - NEW - Migration script for database

## 📋 Service History System ✅ IMPLEMENTED (January 9, 2025)

### Overview
Comprehensive service record tracking system that integrates with Service Schedule for streamlined maintenance management.

### Core Features Implemented

#### 1. Service History Table View ✅
**Layout:** Table with columns: Date | Mileage | Shop | Summary | Cost
**Functionality:**
- Groups multiple service items by date into single record
- Sort by date, shop, or cost
- Shows edit/delete buttons for each service item
- Summary stats: Total services, total cost, average cost, days since last service

#### 2. Service Entry Dialog ✅
**Features Implemented:**
- Date, mileage, shop, invoice # fields
- Service Schedule integration with checkboxes
- Individual cost entry for each selected service item
- Shows sum of service items vs invoice total
- Creates separate history entry for each checked interval
- Notes field for additional information

#### 3. Service Schedule Integration ✅
**Current Workflow:**
1. User can click "Mark Done" on any service interval
2. Dialog opens with that interval pre-selected
3. User can check additional intervals that were serviced
4. Each interval gets its own cost input field
5. System creates individual service history entries
6. Progress bars automatically update based on service date/mileage

### Next Features to Implement

#### ✅ Enhanced Cost Tracking (IMPLEMENTED - January 10, 2025)
**Parts/Labor/Tax Breakdown:**
- Added optional fields for parts cost, labor cost, and taxes
- No validation required - fields are independent
- Allows detailed cost analysis
- Track labor vs parts ratio over time

#### Service History Enhancements
- Export service history to CSV/PDF
- Attach photos/receipts to service records
  - OCR POC completed (January 10, 2025)
  - Tesseract tested - poor results for receipts
  - Google Vision API integration ready - much better accuracy
  - See `/backend/ocr_*_poc.py` for implementations
- Service provider/shop management
- Recurring service reminders
- Cost prediction based on history

#### Analytics Dashboard
- Cost trends over time
- Cost per mile calculations
- Upcoming service predictions
- Compare costs across vehicles
- Service frequency analysis

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

## 🧪 Testing Strategy & Coverage Assessment

### Current Test Coverage Status (6/10)
**Last Assessment**: January 10, 2025

#### ✅ What's Well Tested
- **Frontend Components**: 
  - CalculatorInput (22 tests - comprehensive)
  - ServiceEntryDialog (12 tests)
  - ServiceHistoryTable (8 tests)
  - ServiceIntervalList, ConfirmDialog, ServiceIntervalResearch
- **Backend**:
  - Authentication flows (login, JWT tokens)
  - Basic CRUD operations for cars, todos, service intervals
  - Multi-tenancy isolation
  - Service history creation

#### 🚨 Critical Testing Gaps

##### Frontend Missing Tests
1. **Component Coverage**:
   - CarForm.tsx - No tests for car creation/editing
   - ServiceIntervalEditModal.tsx - No modal behavior tests
   - ServiceIntervalAddModal.tsx - No validation tests
   - EngineTypeDialog.tsx - No engine selection tests
   - AuthContext & ProtectedRoute - No auth flow tests

2. **Business Logic**:
   - Summary line item creation (just implemented)
   - Cost calculation and validation
   - Progress bar calculations
   - Service overdue status logic

3. **Integration Tests**:
   - Complete user flows (create car → add service → track progress)
   - API error handling scenarios
   - Network failure recovery
   - Concurrent user updates

##### Backend Missing Tests
1. **Service Logic**:
   - Cost breakdown calculations
   - Service interval research engine
   - Progress calculation algorithms
   - Data export/import functionality

2. **API Coverage**:
   - Pagination
   - Filtering and search
   - Bulk operations
   - Edge case validations

3. **Database Tests**:
   - Transaction rollbacks
   - Data integrity constraints
   - Concurrent access scenarios

### Testing Roadmap

#### Phase 1: Critical Business Logic (Priority: HIGH)
1. Test summary line item creation feature
2. Test cost calculation and breakdown validation
3. Test service progress calculations
4. Test service overdue detection

#### Phase 2: Component Coverage (Priority: MEDIUM)
1. Add tests for all untested components
2. Test error boundaries
3. Test loading states
4. Test form validations

#### Phase 3: Integration & E2E (Priority: MEDIUM)
1. API integration tests
2. User flow tests
3. Multi-user scenarios
4. Performance tests with large datasets

#### Phase 4: Advanced Testing (Priority: LOW)
1. Visual regression tests
2. Accessibility (a11y) tests
3. Security tests
4. Load testing

### Testing Standards
- Minimum 80% code coverage target
- All new features must include tests
- Run tests before every commit
- Fix failing tests immediately
- Document complex test scenarios

---

**Last Updated**: January 10, 2025
**Version**: 2.4 (Testing Strategy Added)
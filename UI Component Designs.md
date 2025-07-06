# Car Collection App - UI Component Designs

## Design System Overview
- **Framework:** Next.js + Tailwind CSS + Shadcn/ui
- **Color Palette:** Modern, automotive-inspired (deep blues, metallic grays, accent colors)
- **Typography:** Clean, readable fonts with proper hierarchy
- **Layout:** Card-based design with smooth animations and transitions

---

## 1. Dashboard Overview

### Main Dashboard Layout
```
┌─────────────────────────────────────────────────────────────┐
│ 🚗 Car Collection Manager                    [User Avatar] │
├─────────────────────────────────────────────────────────────┤
│ [Quick Stats Cards]                                         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ 5 Cars  │ │ 3 Due   │ │ 12.5k   │ │ $2,450  │            │
│ │ Total   │ │ Service │ │ Miles   │ │ Spent   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                             │
│ [Car Grid - Featured Cards]                                 │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ 🏎️ 2020 Ferrari │ │ 🚙 2018 Porsche │ │ 🚗 2015 BMW     │ │
│ │ 812 Superfast   │ │ 911 Carrera S   │ │ M3 Competition  │ │
│ │                 │ │                 │ │                 │ │
│ │ Mileage: 3,450  │ │ Mileage: 8,920  │ │ Mileage: 15,230 │ │
│ │ Next: Oil 2w    │ │ Next: Annual 1m │ │ Next: Major 3m  │ │
│ │ [2 Issues]      │ │ [0 Issues]      │ │ [1 Issue]       │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│                                                             │
│ [Upcoming Maintenance Timeline]                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📅 This Week: Ferrari Oil Change                        │ │
│ │ 📅 Next Week: Porsche Annual Service                    │ │
│ │ 📅 Next Month: BMW Major Service                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Car Detail View

### Individual Car Page
```
┌─────────────────────────────────────────────────────────────┐
│ ← Back to Dashboard    🏎️ 2020 Ferrari 812 Superfast    [⚙️] │
├─────────────────────────────────────────────────────────────┤
│ [Car Header with Large Image]                               │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Car Photo]                    VIN: ZFF81YHT000123456  │ │
│ │                              Mileage: 3,450 miles      │ │
│ │                              Last Updated: 2 days ago  │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Tab Navigation]                                             │
│ [Overview] [Issues] [Maintenance] [Fuel] [Trips] [History] [Photos] │
│                                                             │
│ [Overview Tab Content]                                       │
│ ┌─────────────────┐ ┌─────────────────┐                     │
│ │ Car Details     │ │ Quick Actions   │                     │
│ │ ─────────────── │ │ ─────────────── │                     │
│ │ Year: 2020      │ │ [Add Issue]     │                     │
│ │ Make: Ferrari   │ │ [Log Fuel]      │                     │
│ │ Model: 812      │ │ [Add Photo]     │                     │
│ │ Color: Rosso    │ │ [Service Log]   │                     │
│ │ Engine: V12     │ │ [Edit Details]  │                     │
│ │ License: ABC123 │ │                 │                     │
│ │ Insurance: Exp  │ │                 │                     │
│ │ 12/15/2024      │ │                 │                     │
│ └─────────────────┘ └─────────────────┘                     │
│                                                             │
│ [Maintenance Status]                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️  Oil Change Due in 14 days                           │ │
│ │ ✅  Annual Service: Completed 6 months ago              │ │
│ │ ⏰  Major Service: Due in 2 years                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Issue Tracking Component

### Issues Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Issues (3)                                    [+ Add Issue] │
├─────────────────────────────────────────────────────────────┤
│ [Filter: All | Open | Resolved]                             │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔴 Replace brake pads                                  │ │
│ │    Due: Dec 15, 2024 • Added: Nov 1, 2024              │ │
│ │    "Front brake pads showing wear, need replacement"   │ │
│ │    [Edit] [Mark Complete] [Delete]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟡 Fix passenger window rattle                          │ │
│ │    Due: None • Added: Nov 5, 2024                      │ │
│ │    "Window rattles when driving over bumps"            │ │
│ │    [Edit] [Mark Complete] [Delete]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 Detail interior                                     │ │
│ │    Due: Dec 1, 2024 • Added: Nov 10, 2024              │ │
│ │    "Interior needs deep cleaning and conditioning"      │ │
│ │    [Edit] [Mark Complete] [Delete]                      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Add Issue Modal]                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Add New Issue                                           │
│ │ ────────────────────────────────────────────────────── │ │
│ │ Title: [________________________]                       │ │
│ │ Description: [________________________]                 │ │
│ │ Due Date: [Date Picker]                                 │ │
│ │                                                         │ │
│ │ [Cancel] [Save Issue]                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Maintenance Tracking Component

### Maintenance Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Maintenance Schedule                        [+ Add Service] │
├─────────────────────────────────────────────────────────────┤
│ [Service Types: Oil Change | Annual | Major | Custom]       │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🛢️  Oil Change                                        │ │
│ │    Interval: 3,000 miles or 1 year                     │ │
│ │    Last: May 15, 2024 (2,800 miles)                    │ │
│ │    Next: Due in 200 miles or May 15, 2025              │ │
│ │    [Log Service] [Edit Settings]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🔧 Annual Service                                      │ │
│ │    Interval: 1 year                                     │ │
│ │    Last: June 1, 2024                                   │ │
│ │    Next: Due June 1, 2025                               │ │
│ │    [Log Service] [Edit Settings]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚙️  Major Service                                      │ │
│ │    Interval: 3 years                                    │ │
│ │    Last: March 15, 2022                                 │ │
│ │    Next: Due March 15, 2025                             │ │
│ │    [Log Service] [Edit Settings]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Service History]                                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📋 Recent Services                                     │ │
│ │ ────────────────────────────────────────────────────── │ │
│ │ • Oil Change - May 15, 2024 (2,800 miles)              │ │
│ │ • Annual Service - June 1, 2024 (3,100 miles)          │ │
│ │ • Brake Fluid - April 10, 2024 (2,600 miles)           │ │
│ │ [View All History]                                      │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Fuel Mileage Tracking Component

### Fuel Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Fuel & Mileage Tracking                    [+ Log Fuel]    │
├─────────────────────────────────────────────────────────────┤
│ [Fuel Economy Chart]                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📊 MPG Over Time                                       │ │
│ │                                                         │ │
│ │ 25 ┤    ●                                              │ │
│ │ 20 ┤  ●   ●                                            │ │
│ │ 15 ┤●       ●                                          │ │
│ │ 10 ┤                    ●                              │ │
│ │  5 ┤                      ●                            │ │
│ │    └─────────────────────────────                      │ │
│ │     Jan  Feb  Mar  Apr  May  Jun                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Quick Stats]                                               │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ 18.5    │ │ 3,450   │ │ $1,250  │ │ 186     │            │
│ │ Avg MPG │ │ Miles   │ │ Spent   │ │ Gallons │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                             │
│ [Recent Fuel Entries]                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📝 Recent Entries                                      │ │
│ │ ────────────────────────────────────────────────────── │ │
│ │ • Dec 1, 2024: 15.2 gal @ 3,450 mi (18.2 mpg)          │ │
│ │ • Nov 15, 2024: 14.8 gal @ 3,200 mi (18.9 mpg)         │ │
│ │ • Nov 1, 2024: 16.1 gal @ 3,000 mi (17.4 mpg)          │ │
│ │ [View All Entries] [Export Data]                        │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Log Fuel Modal]                                            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Log Fuel Entry                                          │ │
│ │ ────────────────────────────────────────────────────── │ │
│ │ Date: [Dec 1, 2024]                                     │ │
│ │ Gallons: [15.2]                                         │ │
│ │ Mileage: [3,450]                                        │ │
│ │ Cost: [$85.50] (optional)                               │ │
│ │ Notes: [________________]                               │ │
│ │                                                         │ │
│ │ [Cancel] [Save Entry]                                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Trip Journal Component

### Trips Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Trip Journal (12 trips)                        [+ Add Trip] │
├─────────────────────────────────────────────────────────────┤
│ [Filter: All | This Year | Last Year | By Destination]      │
│                                                             │
│ [Trip Timeline View]                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🗺️  Summer 2024 Road Trip                              │ │
│ │    Date: July 15-22, 2024                               │ │
│ │    Route: Home → Yellowstone → Glacier → Home           │ │
│ │    Distance: 2,450 miles                                │ │
│ │    Photos: 24 | Notes: "Amazing wildlife sightings"     │ │
│ │    [View Details] [Edit] [Delete]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🏕️  Fall Camping Trip                                  │ │
│ │    Date: October 5-7, 2024                              │ │
│ │    Route: Home → State Park → Home                      │ │
│ │    Distance: 180 miles                                  │ │
│ │    Photos: 8 | Notes: "Perfect weather, great hiking"   │ │
│ │    [View Details] [Edit] [Delete]                       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ [Trip Statistics]                                            │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│ │ 12      │ │ 3,240   │ │ 18      │ │ $1,850  │            │
│ │ Trips   │ │ Miles   │ │ Days    │ │ Spent   │            │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
│                                                             │
│ [Add Trip Modal]                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Add New Trip                                            │ │
│ │ ────────────────────────────────────────────────────── │ │
│ │ Trip Name: [________________________]                   │ │
│ │ Start Date: [Date Picker]                               │ │
│ │ End Date: [Date Picker]                                 │ │
│ │ Starting Mileage: [_____]                               │ │
│ │ Ending Mileage: [_____]                                 │ │
│ │ Destination: [________________________]                 │ │
│ │ Route: [________________________]                       │ │
│ │ Notes: [________________________]                       │ │
│ │                                                         │ │
│ │ [Cancel] [Save Trip]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Photo Gallery Component

### Photos Tab
```
┌─────────────────────────────────────────────────────────────┐
│ Photo Gallery (24 photos)                   [+ Add Photos] │
├─────────────────────────────────────────────────────────────┤
│ [Filter: All | Exterior | Interior | Documents | Receipts] │
│                                                             │
│ [Photo Grid - Masonry Layout]                               │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ [1] │ │ [2] │ │ [3] │ │ [4] │ │ [5] │ │ [6] │            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │ [7] │ │ [8] │ │ [9] │ │[10] │ │[11] │ │[12] │            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐            │
│ │[13] │ │[14] │ │[15] │ │[16] │ │[17] │ │[18] │            │
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘            │
│                                                             │
│ [Photo Viewer Modal]                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [Large Photo Display]                                   │ │
│ │                                                         │ │
│ │ "Front view - Ferrari 812 Superfast"                   │ │
│ │ Added: Dec 1, 2024                                      │ │
│ │                                                         │ │
│ │ [← Previous] [Next →] [Download] [Delete]               │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Mobile-First Components

### Mobile Dashboard
```
┌─────────────────────────┐
│ 🚗 Car Collection       │
├─────────────────────────┤
│ [Quick Add Buttons]     │
│ [📝 Add Issue] [⛽ Log Fuel] │
│                         │
│ [Car Cards - Stacked]   │
│ ┌─────────────────────┐ │
│ │ 🏎️ Ferrari 812      │ │
│ │ 3,450 miles         │ │
│ │ ⚠️ Oil due in 14d   │ │
│ │ [2 Issues]          │ │
│ └─────────────────────┘ │
│                         │
│ ┌─────────────────────┐ │
│ │ 🚙 Porsche 911      │ │
│ │ 8,920 miles         │ │
│ │ ✅ All caught up    │ │
│ │ [0 Issues]          │ │
│ └─────────────────────┘ │
│                         │
│ [Bottom Navigation]     │
│ [🏠] [🚗] [📅] [📊] [👤] │
└─────────────────────────┘
```

---

## 8. Notification Components

### Notification Center
```
┌─────────────────────────────────────────────────────────────┐
│ Notifications (3)                              [Mark All]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ⚠️  Ferrari 812: Oil change due in 14 days             │ │
│ │    [Snooze 1 week] [Mark Complete] [Dismiss]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 📅 Porsche 911: Annual service due next week           │ │
│ │    [Snooze 1 week] [Mark Complete] [Dismiss]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 💰 BMW M3: $450 spent on brake pads this month         │ │
│ │    [View Details] [Dismiss]                             │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Design Principles

1. **Clean & Modern:** Minimal design with plenty of white space
2. **Card-Based:** Information organized in clear, scannable cards
3. **Color-Coded:** Status indicators (red/yellow/green) for quick recognition
4. **Responsive:** Works beautifully on desktop, tablet, and mobile
5. **Interactive:** Smooth animations, hover effects, and transitions
6. **Accessible:** High contrast, readable fonts, keyboard navigation

## Next Steps

Would you like me to:
1. **Create actual code examples** for any of these components?
2. **Design the data flow** between components?
3. **Explore the backend API structure** that would support this UI?
4. **Start building a prototype** with one of these components?

What component excites you most to see in action? 
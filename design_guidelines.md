# Design Guidelines: LA Events Map App

## Architecture Decisions

### Authentication
**No authentication required** - This is a utility app for browsing local events.

**Profile/Settings Screen** (accessible from Map screen header):
- User-customizable avatar (generate 3 preset avatars with LA/California aesthetic - palm tree silhouette, sunshine icon, city skyline)
- Display name field
- App preferences:
  - Default map zoom level
  - Enable/disable event notifications
  - Preferred event categories
  - Light/dark theme toggle

### Navigation Architecture
**Stack-Only Navigation** - Single feature area (browsing LA events)

**Navigation Flow:**
1. Map Screen (root/home)
   - Header right button: Profile/Settings icon
   - Header left button: List view toggle icon
2. Event Details (native modal from Map Screen)
3. List View (pushed on stack from Map Screen)
4. Profile/Settings (pushed on stack from Map Screen)

### Screen Specifications

#### Map Screen (Root)
**Purpose:** Browse LA area events on an interactive map

**Layout:**
- Header: Custom transparent header
  - Left button: List icon (toggles to List View)
  - Right button: Settings icon
  - Title: "LA Events"
- Main content: Full-screen map component (non-scrollable)
  - Default center: Downtown LA (34.0522° N, 118.2437° W)
  - Default zoom: Shows greater LA area
- Floating elements:
  - Category filter chips (horizontal scroll) positioned at top
  - Location/zoom controls (bottom-right corner)

**Components:**
- Interactive map view
- Custom event markers (color-coded by category)
- Horizontal scrollable filter chips (Entertainment, Food, Sports, Arts, All)
- Map controls (zoom in/out, re-center)

**Safe Area Insets:**
- Top: headerHeight + Spacing.xl
- Bottom: insets.bottom + Spacing.xl
- Filter chips top offset: headerHeight + Spacing.md

#### Event Details (Modal)
**Purpose:** Display full event information when marker is tapped

**Layout:**
- Presented as bottom sheet (slides up from bottom, doesn't cover full screen)
- Draggable handle at top
- Scrollable content area
- Close button (X) in top-right corner

**Components:**
- Event category badge
- Event title (large, bold)
- Date and time
- Location address
- Description text
- "Get Directions" button (opens Maps app)
- "Save Event" button (saves to local favorites)

**Safe Area Insets:**
- Bottom: insets.bottom + Spacing.xl

#### List View Screen
**Purpose:** Browse events in list format with filtering

**Layout:**
- Header: Default navigation header
  - Left button: Back arrow
  - Title: "Events List"
  - Right button: Filter icon (opens filter modal)
- Main content: Scrollable list view
- Search bar below header

**Components:**
- Search bar with placeholder "Search events..."
- Event cards in vertical list
  - Event thumbnail/category icon
  - Title, date, distance from user
  - Tap card to open Event Details modal

**Safe Area Insets:**
- Top: Spacing.xl (default header is not transparent)
- Bottom: insets.bottom + Spacing.xl

#### Profile/Settings Screen
**Purpose:** Customize user preferences and app settings

**Layout:**
- Header: Default navigation header
  - Left button: Back arrow
  - Title: "Settings"
- Main content: Scrollable form

**Components:**
- Avatar selector (3 preset options: palm tree, sunshine, skyline)
- Text input for display name
- Toggle switches for preferences
- Theme selector

**Safe Area Insets:**
- Top: Spacing.xl
- Bottom: insets.bottom + Spacing.xl

## Design System

### Color Palette
**Primary:** 
- Main: `#FF6B35` (Vibrant sunset orange - evokes LA sunsets)
- Light: `#FF8F66`
- Dark: `#E54F1F`

**Secondary:**
- Main: `#004E89` (Deep blue - evokes LA ocean/sky)
- Light: `#3374A8`

**Event Categories:**
- Entertainment: `#FF6B35` (orange)
- Food: `#F7B32B` (golden yellow)
- Sports: `#00A676` (teal green)
- Arts: `#9B51E0` (purple)

**Neutrals:**
- Background: `#FFFFFF` (light mode), `#1A1A1A` (dark mode)
- Surface: `#F5F5F5` (light), `#2A2A2A` (dark)
- Text Primary: `#1A1A1A` (light), `#FFFFFF` (dark)
- Text Secondary: `#666666` (light), `#A0A0A0` (dark)

### Typography
- Headers: SF Pro Display Bold, 24-28pt
- Subheaders: SF Pro Text Semibold, 18-20pt
- Body: SF Pro Text Regular, 16pt
- Caption: SF Pro Text Regular, 14pt

### Visual Design
**Icons:**
- Use Feather icons from @expo/vector-icons
- System icons for navigation (back, settings, list)
- Custom category icons (generate 4 minimal line-art icons for event categories)

**Map Markers:**
- Custom teardrop-shaped markers
- Color-coded by event category
- Active state: slightly larger with subtle pulse animation
- Clustered markers show count badge

**Touchable Feedback:**
- Filter chips: Scale down to 0.95, increase opacity on press
- List items: Light background color change on press
- Buttons: Slight scale down (0.97) with opacity change
- Map markers: Scale up to 1.15 on tap

**Floating Elements:**
- Category filter chips: subtle drop shadow
  - shadowOffset: {width: 0, height: 2}
  - shadowOpacity: 0.10
  - shadowRadius: 2
- Map control buttons: same shadow as above

**Cards (Event List):**
- Border radius: 12px
- No drop shadow, use subtle border instead
- Padding: 16px
- Spacing between cards: 12px

### Required Assets
1. **Event Category Icons** (4 minimal line-art icons):
   - Entertainment: movie/theater masks
   - Food: fork and knife crossed
   - Sports: basketball
   - Arts: paint palette

2. **User Avatar Presets** (3 options):
   - Palm tree silhouette on gradient background
   - Stylized sunshine/sun rays icon
   - LA skyline silhouette

3. **Map Marker Icon:**
   - Teardrop pin shape (generated in 4 category colors)

### Accessibility
- Minimum touch target: 44x44pt
- Color contrast ratio: minimum 4.5:1 for text
- Category filters should work without color alone (include icons)
- Support Dynamic Type (text scaling)
- VoiceOver labels for all interactive elements
- Map markers should have accessibility labels with event name and category
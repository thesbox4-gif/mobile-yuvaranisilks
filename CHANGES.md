# NanaBanana Mobile App - Redesign Change Report

Date: 2026-05-20

---

## Summary

Complete redesign of the mobile app from a single-role admin/employee portal into a
role-aware app with three distinct experiences: Admin, Employee, and Customer (User Mode).

**17 files changed/created** across navigation, screens, store, API, constants, and UI.

---

## 1. Role-Based Navigation

**File:** `src/navigation/MainTabs.jsx` (rewritten)

- Three separate tab configurations based on `user.role` and `viewMode`:
  - **Admin** (5 tabs): Dashboard, Collections, + Add, Customers, More
  - **Employee** (4 tabs): Dashboard, Collections, + Add, Profile
  - **Customer / User Mode** (3 tabs): Dashboard, Collections, Profile
- Center "+" button available only for admin/employee roles
- Separate stack navigators for each tab to avoid navigation conflicts

**File:** `src/navigation/AppNavigator.jsx` (unchanged - already handles auth gating)

---

## 2. Auth Store - View Mode Toggle

**File:** `src/store/authStore.jsx` (modified)

- Added `viewMode` state: `'admin'` (default) or `'user'`
- Added `setViewMode(mode)` action
- `clearAuth()` now also resets `viewMode` to `'admin'`
- `viewMode` is NOT persisted (resets on app restart)

---

## 3. Sign-Out Fix

**File:** `src/lib/api.jsx` (modified - added `logout` export)

- New export: `logout()` calls `POST /api/auth/logout` with `.catch(() => {})` fallback
- Server-side token invalidation happens before local state clear

**File:** `src/screens/profile/ProfileScreen.jsx` (rewritten)

- `handleLogout` now calls `await logout()` then `clearAuth()`
- Gracefully handles server unreachable (sign-out still works locally)

---

## 4. Landing Page (Dashboard)

**File:** `src/screens/dashboard/DashboardScreen.jsx` (rewritten)

- No products displayed on landing page
- Gradient header (amber-500 to amber-600) with greeting and date
- Role-aware content:
  - **Admin**: Revenue KPI card, notification banner, Quick Actions grid (Collections, Approvals, Analytics, Team), Inventory summary (4 metrics), Recent Sales list
  - **Employee**: My Sales KPI, Quick Actions (Collections, Add Product), Recent Sales
  - **Customer/User Mode**: Welcome message, Collections quick action
- Uses `getDashboard()` and `getOfflineSales()` API queries

---

## 5. Collections Page (Products)

**File:** `src/screens/products/ProductsScreen.jsx` (rewritten)

- Three product-type tabs at top: Sarees, Dresses, Gold/Jewellery
- Category filter chips below tabs from mock categories
- 2-column product grid with `useInfiniteQuery` pagination
- Pull-to-refresh support
- "All" chip as default filter (no category filter applied)
- Role-aware: admin/employee see "+" add button, customers don't

**File:** `src/constants/categories.jsx` (new)

- Mock Indian market categories for each product type:
  - **Sarees** (10): Banarasi Silk, Kanchipuram Pattu, Mysore Silk, Chanderi, Tussar, Pochampally Ikat, Paithani, Bandhani, Organza, Cotton
  - **Dresses** (10): Anarkali, Lehenga, Salwar Kameez, Kurti, Sharara, Gharara, Indo-Western, Palazzo Set, Gown, Crop Top Set
  - **Gold/Jewellery** (10): Temple Jewellery, Kundan, Polki, Antique Gold, Meenakari, Filigree, Bridal Set, Mangalsutra, Jhumka, Bangles
- Also exports: `GOLD_PURITIES`, `GOLD_COLORS`, `STONE_TYPES`

---

## 6. Product Wizard (Add/+)

**Files:** `src/screens/products/wizard/` (kept existing 6-step flow)

The existing wizard already handles:
- Step 1: Type + Category selection
- Step 2: Image upload per color (camera/gallery via expo-image-picker) + AI studio
- Step 3: Variants grid (Color x Size for dresses, Color-only for sarees, Weight for gold)
- Step 4: Title + Description with AI generation
- Step 5: Pricing (base price, discount %, optional coupon)
- Step 6: Review with Publish or Save as Draft

The center "+" tab press navigates directly to the wizard with `mode: 'create'`.

---

## 7. Customers Screen (Admin Only)

**File:** `src/screens/customers/CustomersScreen.jsx` (new)

- Day-wise order list using SectionList grouped by date
- Date headers formatted as "Monday, 20 May 2026"
- Filter tabs: All / Pending / Completed
- Search by customer name
- Customer cards with avatar initial, name, product, phone, price, status badge
- Tapping a card navigates to CustomerDetail

**File:** `src/screens/customers/CustomerDetailScreen.jsx` (new)

- Full order details: customer info (name, phone, email, address)
- Products ordered with qty and price
- Payment info and order date
- Status badge with colored background
- Context-aware action button:
  - "Confirm Order" (placed -> confirmed)
  - "Start Processing" (confirmed -> processing)
  - "Mark as Shipped" (processing -> shipped)
  - "Mark as Delivered" (shipped -> delivered)
  - Hidden when delivered/cancelled

---

## 8. Analytics Screen

**File:** `src/screens/analytics/AnalyticsScreen.jsx` (rewritten)

- Sales Trend: 30-day bar chart using react-native-gifted-charts
- Top Products: Ranked list by revenue with sale counts
- Top Performers: Employee ranking by revenue
- Sales Summary: Online vs Offline breakdown
- Uses: `getSales()`, `getCategorySales()`, `getEmployeePerformance()`, `getSalesSummary()`

---

## 9. Team Screen + Employee Detail

**File:** `src/screens/team/TeamScreen.jsx` (new)

- Active / Pending employee tabs
- Employee cards with avatar, name, status badge
- Pending tab: Approve (green) / Reject (red) action buttons
- Active tab: tap to navigate to EmployeeDetail

**File:** `src/screens/team/EmployeeDetailScreen.jsx` (new)

- Employee profile card (avatar, name, email, role badge)
- Performance KPIs: Total Sales, Revenue, Items Sold
- Recent sales list with product names, quantities, dates

---

## 10. More Screen

**File:** `src/screens/MoreScreen.jsx` (modified)

- Added "Team" menu item in Admin section
- Renamed "Employees" to "Employee Approvals"
- Profile card shows "User Mode" badge when active
- Added `viewMode` reading from auth store

---

## 11. Profile Screen

**File:** `src/screens/profile/ProfileScreen.jsx` (rewritten)

- Kept: Avatar, name/email/role display, edit form, app info
- Added: User Mode toggle card (admin/employee only)
  - "Switch to User Mode" / "Switch to Admin/Employee Mode"
  - Eye icon / Shield icon
- Added: My Sales section (employee only) with total count and revenue
- Fixed: Sign-out calls server logout endpoint before local clear

---

## 12. Indian-Themed UI/UX

**File:** `src/components/ui/EmptyState.jsx` (rewritten)

- Gradient amber background on icon circle
- Themed messages per context (saree, dress, jewellery, orders, team, etc.)
- Decorative amber divider line
- Shadow-elevated action button
- Warm color palette throughout

**Applied across all screens:**
- Color palette: Saffron/amber (#f59e0b), maroon (#9f1239), gold (#d4a017), cream (#fef3c7)
- Gradient headers on Dashboard using expo-linear-gradient
- Warm amber tones on tab bar, buttons, badges
- Indian-themed empty state messages

---

## Files Changed Summary

| Action | File | Description |
|--------|------|-------------|
| Modified | `src/store/authStore.jsx` | Added viewMode state + setViewMode |
| Modified | `src/lib/api.jsx` | Added logout() export |
| Rewritten | `src/navigation/MainTabs.jsx` | Role-based tab configs (Admin/Employee/Customer) |
| Rewritten | `src/screens/dashboard/DashboardScreen.jsx` | Product-free landing page with KPIs |
| Rewritten | `src/screens/products/ProductsScreen.jsx` | 3-tab collections with category filters |
| Rewritten | `src/screens/analytics/AnalyticsScreen.jsx` | Charts + employee performance |
| Rewritten | `src/screens/profile/ProfileScreen.jsx` | User mode toggle + sign-out fix |
| Rewritten | `src/screens/MoreScreen.jsx` | Added Team nav + User Mode badge |
| Rewritten | `src/components/ui/EmptyState.jsx` | Indian-themed with gradients |
| Created | `src/constants/categories.jsx` | Mock Indian market categories |
| Created | `src/screens/customers/CustomersScreen.jsx` | Day-wise order management |
| Created | `src/screens/customers/CustomerDetailScreen.jsx` | Order detail + dispatch |
| Created | `src/screens/team/TeamScreen.jsx` | Employee list (Active/Pending) |
| Created | `src/screens/team/EmployeeDetailScreen.jsx` | Employee sales performance |

**Unchanged files:** All wizard steps (Step1-6), ProductCard, ProductDetailScreen, OrdersScreen, OrderDetailScreen, CategoriesScreen, CouponsScreen, EmployeesScreen, StatusUpdateSheet, auth screens (Login/Register/Pending), all lib/ utilities, App.jsx, app.json.

---

## Role Access Matrix

| Feature | Admin | Employee | Customer (User Mode) |
|---------|-------|----------|---------------------|
| Dashboard / Landing | Full KPIs + Quick Actions | My Sales + Quick Actions | Welcome + Collections link |
| Collections | View + Add + Edit | View + Add + Edit | View only |
| Add Product (+) | Yes | Yes | No |
| Customers | Full access | No | No |
| Analytics | Full access | No | No |
| Team | Full access | No | No |
| Employee Approvals | Full access | No | No |
| Coupons | Full access | No | No |
| Categories | Full access | Full access | View in More |
| Profile | Edit + User Mode toggle | Edit + My Sales + User Mode | Edit only |
| Sign Out | Server + Local | Server + Local | Server + Local |

---

## 13. Wizard & Collections Revamp (2026-05-20)

### Add Product — Single-Page Form

**File:** `src/screens/products/wizard/ProductWizardScreen.jsx` (rewritten)

Replaced the 7-step wizard with one scrollable page matching the reference design:

| Section | Contents |
|---------|----------|
| Reference Images | 8 labeled photo blocks per type (saree/dress/jewellery), camera + gallery picker, upload via API |
| Generate AI Image | Primary photo preview, category-specific AI generation, Use This / Try Again |
| Details | Name, description, AI content generate, category chips + inline Create New |
| Pricing | Base price (INR), discount %, live preview, optional coupon, tags with removable chips |
| Variants | Type-specific: saree (colors + qty), dress (sizes × colors grid), gold (purity/color/stone/weight) |
| Footer | Save Draft + Publish buttons (sticky) |

**Wizard step files** (`StepPhotos.jsx`, `StepCategory.jsx`, etc.) remain in repo but are no longer imported.

### Type Selector Modal (+ Button)

**File:** `src/components/products/TypeSelectorModal.jsx` (updated)

- Sarees + Dresses side-by-side, Gold centered below
- Indian-themed warm palette, decorative dividers, slide animation
- Modal moved to top-level `MainTabs` to fix overlap with Collections tab

**File:** `src/navigation/MainTabs.jsx` (updated)

- `TypeSelectorModal` rendered once at root `MainTabs` (not inside each tab navigator)
- Admin/Employee tabs pass `onCreatePress` callback; modal navigates to wizard with `type` param

### Hierarchical Collections

**File:** `src/screens/products/ProductsScreen.jsx` (rewritten)

Three-level tree navigation with back arrow:

1. **Level 1** — Three large cards: Sarees, Dresses, Gold & Jewellery (with item counts)
2. **Level 2** — Subcategory cards from `MOCK_CATEGORIES` (e.g. Banarasi Silk, Anarkali)
3. **Level 3** — Product grid (`ProductCard`), API data with mock fallback

### Mock Products & Product Detail

**File:** `src/constants/mockProducts.jsx` (created)

- 15 mock products (5 sarees, 5 dresses, 5 gold) with Indian names, INR pricing, placeholder images

**File:** `src/components/products/ProductCard.jsx` (updated)

- Colored placeholder cards when no image URL (pink/violet/amber by type)

**File:** `src/screens/products/ProductDetailScreen.jsx` (rewritten)

- Swipeable image gallery with dot indicators
- Role-aware: customers see clean view; staff see stock + Sell; admin see publish/delete/edit

### Photo Picker Fix

- Explicit camera/gallery permission requests with user-friendly alerts
- try/catch around all `ImagePicker` calls
- Visible "Tap to add" labels on empty photo blocks

### Indian UI Polish (this pass)

- Warm `#fffaf5` background across Collections and Add Product screens
- Decorative `✦` dividers between sections
- Amber/maroon accent colors, cream card borders

---

## Files Changed Summary (Latest Pass)

| Action | File | Description |
|--------|------|-------------|
| Rewritten | `src/screens/products/wizard/ProductWizardScreen.jsx` | Single-page add product form |
| Rewritten | `src/screens/products/ProductsScreen.jsx` | 3-level hierarchical collections |
| Rewritten | `src/screens/products/ProductDetailScreen.jsx` | Swipeable gallery + role-aware sell |
| Modified | `src/navigation/MainTabs.jsx` | Top-level TypeSelectorModal |
| Modified | `src/components/products/TypeSelectorModal.jsx` | Indian theme + slide animation |
| Modified | `src/components/products/ProductCard.jsx` | Placeholder cards for mock data |
| Created | `src/constants/mockProducts.jsx` | 15 mock Indian products |
| Created | `src/screens/products/wizard/StepPhotos.jsx` | (legacy, unused) |
| Created | `src/screens/products/wizard/StepCategory.jsx` | (legacy, unused) |
| Created | `src/screens/products/wizard/StepContent.jsx` | (legacy, unused) |
| Created | `src/screens/products/wizard/StepVariants.jsx` | (legacy, unused) |
| Created | `src/screens/products/wizard/StepPricing.jsx` | (legacy, unused) |
| Created | `src/screens/products/wizard/StepAIGenerate.jsx` | (legacy, unused) |

# Motoluxe Admin System

## Project kickoff directive

Build a production-ready admin area for the Motoluxe autocare storefront at
`/admin`.

The admin must use the same live product, customer, wishlist, and order data as
the storefront. It must not be a disconnected mock panel or replace the
existing MongoDB architecture.

The attached implementation blueprint remains the detailed source document:

`attached_assets/motolux-admin-blueprint_1788429456106.md`

This file records the project-specific decisions and the implementation
starting point for the next admin phase.

## Admin foundation implemented

The first admin foundation is now wired:

- `/admin/login` provides username/password sign-in.
- `/admin/setup` creates the first owner account exactly once with only a
  username, password, and confirmation.
- Passwords are stored as salted PBKDF2 hashes in MongoDB.
- Admin sessions use a separate signed HttpOnly cookie and
  `admin_sessions` collection.
- `/admin` is protected by the admin session and redirects signed-out visitors
  to the login screen.
- `/api/admin/auth/*` contains login, logout, session, setup, and setup-status
  endpoints.

The initial setup form is the place to enter the owner username and password.
No credentials belong in this file or in source control. Do not add an
anonymous password overwrite flow: if the password is forgotten, use a
controlled owner recovery process so a public visitor cannot take over the
store.

## Existing storefront foundation

- Framework: React + TypeScript + TanStack Start + Vite.
- Server runtime: Node Nitro preset.
- Database: MongoDB through the existing `MONGODB_URI` secret.
- Existing collections:
  - `customers`
  - `customer_otps`
  - `customer_sessions`
  - `orders`
- Customer authentication: full name + phone number + one-time code.
- Customer sessions: signed HttpOnly cookie backed by MongoDB.
- Customer wishlist: stored as product slugs on the authenticated customer
  record.
- Catalog: the current static Motoluxe catalog in `src/data/catalog.ts`.
- Storefront categories currently include chain care, engine care, and body
  detailing.
- Storefront pricing currently uses “Request price”.
- Orders store the authenticated customer ID, customer name and phone,
  selected products, quantities, delivery details, and status.
- Current visual language: dark Motoluxe surfaces, red primary actions, yellow
  hazard stripes, and Oswald/Barlow typography.

Preserve all existing storefront routes and customer behavior while adding the
admin area.

## Admin authentication foundation

Create a separate admin authentication system. Admin credentials must never be
stored in plaintext or exposed to the client.

The future `admin` collection should contain records shaped like:

```ts
{
  _id: ObjectId;
  username: string;
  usernameLower: string;
  passwordHash: string;
  role: "owner" | "manager" | "catalog_editor" | "operations" | "support" | "viewer";
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}
```

Required behavior:

- Admin login at `/admin/login`.
- Protected `/admin` screens and `/api/admin/*` routes.
- Passwords stored with a strong salted password hash.
- Signed, HttpOnly, SameSite admin session cookie.
- Logout and session expiry.
- Username lookup must be case-insensitive.
- Disabled admin records cannot sign in.
- Never place usernames, passwords, database URLs, session secrets, or provider
  credentials in source-controlled files or client bundles.
- The first owner account should be created through a controlled setup flow,
  not by hardcoding credentials.

At minimum, only the `owner` role may manage admin users, settings, exports,
and destructive actions.

## Admin shell structure

Use a persistent, information-dense admin shell that reuses Motoluxe design
tokens without copying the storefront hero layout.

Primary navigation:

1. Overview
2. Products & catalog
3. Categories
4. Brands
5. Vehicle fitment
6. Inventory
7. Warehouses
8. Suppliers
9. Purchase orders
10. Orders
11. Returns & refunds
12. Customers
13. Reviews & questions
14. Coupons & promotions
15. Homepage/content
16. Reports & exports
17. Settings
18. Admin users and roles

On mobile, collapse the sidebar into an accessible menu.

Every admin list must include loading, empty, error, search, filtering,
sorting, pagination or safe limits, and success/error feedback.

## Phase 1: admin foundation

Build working persistence and validation in this order:

1. Admin collection and password/session helpers.
2. `/admin/login`, logout, and protected admin route guard.
3. Responsive admin shell and navigation.
4. Overview dashboard with current order/customer/catalog counts.
5. Products list using the existing Motoluxe catalog.
6. Product create/edit/archive flow backed by the shared catalog model.
7. Categories and brands management.
8. Orders list and order detail using the existing `orders` collection.
9. Customers list and customer detail using the existing `customers` collection.

Do not create fake KPI values or placeholder CRUD screens. If a capability does
not exist in the current storefront data model, show an explicit unavailable
state or implement the required persistence before exposing the control.

## Automotive catalog direction

Translate normal ecommerce concepts into autocare concepts:

- SKU
- OEM/MPN part number
- Brand
- Product category
- Vehicle make/model/variant
- Fitment mapping
- Warehouse stock
- Supplier
- Purchase order
- Warranty
- Shipping class
- Returns and refunds

Do not add unrelated apparel or saree-specific fields.

Vehicle fitment must use stable reusable vehicle IDs rather than duplicated
free-text vehicle names. Product variants should be added only when there is a
meaningful purchasable difference such as brand, quality tier, position, size,
pack quantity, or vehicle-specific version.

## Shared data and API rules

- Reuse the existing MongoDB database and server conventions.
- Protect every admin API route with admin authentication and role checks.
- Validate all request payloads on the server.
- Keep stable IDs for products, variants, vehicles, orders, and fitments.
- Do not trust client-submitted totals, stock values, permissions, or status
  transitions.
- Do not silently fall back to fake data when MongoDB or an API fails.
- Use explicit error messages.
- Add safe limits or pagination to large collections.
- Avoid N+1 queries in admin lists.
- Archive products referenced by orders instead of deleting them.
- Preserve existing storefront records when adding fields.
- Record audit events for catalog, inventory, order status, returns/refunds,
  coupons, settings, and admin-user changes.

Planned admin API resources:

```text
/api/admin/auth/login
/api/admin/auth/logout
/api/admin/auth/me
/api/admin/summary
/api/admin/products
/api/admin/products/:id
/api/admin/categories
/api/admin/brands
/api/admin/vehicles
/api/admin/fitments
/api/admin/inventory
/api/admin/inventory/movements
/api/admin/warehouses
/api/admin/suppliers
/api/admin/purchase-orders
/api/admin/orders
/api/admin/orders/:id
/api/admin/returns
/api/admin/customers
/api/admin/reviews
/api/admin/coupons
/api/admin/content
/api/admin/settings
/api/admin/audit-log
/api/admin/exports
```

## Dashboard direction

The overview dashboard should support selectable periods such as today, 7
days, 30 days, and a custom range when enough data exists.

Use live data for:

- Orders
- New customers
- Returning customers
- Pending fulfillment
- Low-stock and out-of-stock products when inventory exists
- Recent orders
- Recent inventory movements
- Sales and revenue metrics when finalized prices exist

Because the current storefront uses “Request price”, do not fabricate gross
sales, net sales, average order value, margin, or payment metrics. Show a clear
not-configured state until those values are supported by the order model.

## UI requirements

All admin forms and lists must support:

- Clear labels and accessible focus states.
- Preserving entered values after validation errors.
- Inline validation.
- Disabled duplicate submissions.
- Saving and saved feedback.
- Permission denied state.
- Not found state.
- Destructive-action confirmation.
- Keyboard navigation.
- Readable status labels that do not rely on color alone.
- Responsive desktop and mobile layouts.

Keep the admin more operational and information-dense than the public
storefront, while retaining Motoluxe red/yellow/black branding.

## Implementation phases after foundation

### Phase 2: automotive catalog

- SKU, OEM, MPN, barcode, tax, warranty, manufacturer, and origin fields.
- Reusable vehicle records.
- Product-to-vehicle fitment mapping.
- Fitment notes and verification status.
- Customer-facing fitment visibility only after the storefront supports it.
- Variants only where the business requires them.

### Phase 3: operations

- Inventory movements and stock adjustments.
- Warehouses and transfers.
- Suppliers and purchase orders.
- Order detail, status history, and fulfillment data.
- Returns, refunds, replacements, and audit-safe restocking.

### Phase 4: growth and reporting

- Coupons and promotions.
- Reviews, questions, and fitment feedback.
- Homepage and storefront content.
- CSV exports and reports.
- Audit-log screens.
- Bulk imports.

Finish each phase with real persistence, validation, and UI behavior before
moving to the next phase.

## Acceptance criteria

### Access and security

- Signed-out users cannot access admin screens or data.
- Every admin API endpoint enforces authentication and authorization.
- Viewer users cannot mutate data.
- Owner-only actions are protected.
- Passwords and secrets are never exposed or stored in plaintext.

### Data integrity

- Storefront and admin use the same live MongoDB data.
- Existing customer, wishlist, and order behavior remains intact.
- Existing records are not silently deleted or rewritten.
- Errors are explicit and visible.
- Product and order references remain stable.

### Verification before completion

Before declaring the admin complete:

1. Run the project build and type checks.
2. Run available tests.
3. Verify admin login and logout.
4. Verify session expiry and permission restrictions.
5. Verify product, category, brand, order, and customer workflows.
6. Verify empty, loading, error, validation, not-found, and denied states.
7. Verify desktop and mobile layouts.
8. Check browser and server logs for new errors.
9. Confirm storefront and admin read and write the same live data.

## Next implementation step

The protected `/admin/login` and `/admin` shell plus the MongoDB-backed
one-time owner setup flow are now in place. Do not request or commit
credentials in the codebase; credentials must be entered through the setup
screen and stored only as a secure hash.

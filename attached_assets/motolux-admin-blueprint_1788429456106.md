# Motolux Autocare Parts — Admin System Blueprint

## Purpose

Build a production-ready admin panel for the Motolux/Motoluz automotive spare-parts ecommerce website.

The admin should have the same level of control as the existing Bawari Banno ecommerce admin panel, but all terminology, data models, workflows, validation, and screens must be adapted for automotive parts.

This document is an implementation brief for Replit Agent. Treat it as the source of truth for scope, behavior, and acceptance criteria.

---

## 1. First inspect the existing Motolux project

Before writing code:

1. Inspect the full Motolux storefront structure.
2. Identify the existing framework, routes, API/server code, database, authentication, storage, and styling conventions.
3. Find the current product, category, cart, checkout, order, customer, and payment data models.
4. Reuse the existing database and API architecture. Do not replace an existing database with a new one.
5. Reuse existing components, layout primitives, form patterns, image handling, and design tokens where practical.
6. Preserve all existing storefront routes and customer behavior.
7. Identify whether the storefront already supports:
   - Vehicle fitment
   - SKU or OEM part numbers
   - Product brands
   - Warehouses or multiple stock locations
   - Shipping integrations
   - Customer accounts
   - Coupons or promotions
   - Reviews
   - Returns and refunds

If a required business decision cannot be safely inferred from the current project, ask before making a destructive or architecture-changing decision.

Do not create a disconnected mock admin. The admin must read and write the same live catalog and order data used by the storefront.

---

## 2. Admin access and security

Create a protected admin area at the project’s established admin route, normally `/admin`.

### Authentication

- Require authentication for every admin screen and admin API route.
- Reuse the project’s existing authentication system.
- If no admin authentication exists, add a secure email/password admin login using the project’s existing server/session conventions.
- Store passwords securely; never store plaintext passwords.
- Use secure, HttpOnly, SameSite cookies or the project’s existing secure session mechanism.
- Add logout and session expiry.
- Never expose secrets, database URLs, session secrets, or credentials in the client bundle or source-controlled files.

### Roles

Support role-based permissions where the project can support them:

| Role | Capabilities |
|---|---|
| Owner | Full access, settings, team members, exports, destructive actions |
| Manager | Products, inventory, orders, customers, suppliers, promotions |
| Catalog editor | Products, categories, brands, fitment, media |
| Operations | Orders, shipments, returns, inventory movements |
| Support | Customers, orders, reviews; no catalog deletion |
| Viewer | Read-only access |

At minimum, protect destructive actions and settings behind the Owner role.

### Audit safety

Record an audit event for:

- Product create, edit, archive, restore, and delete
- Stock adjustments
- Order status changes
- Refunds and returns
- Coupon changes
- Category or fitment changes
- Admin user and settings changes

Each audit event should include actor, action, entity, entity ID, timestamp, and a concise before/after summary where practical.

---

## 3. Admin navigation

Use a persistent admin shell similar to the existing ecommerce admin:

- Overview
- Products & catalog
- Vehicle fitment
- Categories
- Brands
- Inventory
- Warehouses
- Suppliers
- Purchase orders
- Orders
- Returns & refunds
- Customers
- Reviews & questions
- Coupons & promotions
- Homepage/content
- Reports & exports
- Settings
- Admin users and roles

On mobile, collapse the sidebar into a menu.

Every list screen must support loading, empty, error, search, filtering, sorting, pagination or safe limits, and success/error feedback.

---

## 4. Overview dashboard

Show operational KPIs for selectable periods such as today, 7 days, 30 days, and custom range:

- Gross sales
- Net sales
- Orders
- Average order value
- Units sold
- New customers
- Returning customers
- Low-stock parts
- Out-of-stock parts
- Pending payments
- Pending fulfillment
- Open returns
- Purchase orders awaiting receipt

Include:

- Sales trend chart
- Orders by status
- Revenue by category
- Revenue by brand
- Top-selling parts
- Low-stock alerts
- Recent orders
- Recent inventory movements
- Failed or cancelled payment alerts

Clicking a KPI or chart segment should take the admin to the corresponding filtered list.

---

## 5. Product and catalog management

### Product list

Display:

- Product image
- Product name
- SKU
- OEM/MPN part number
- Brand
- Category
- Vehicle fitment count
- Selling price
- Stock status
- Published/draft status
- Last updated

Support:

- Search by name, SKU, OEM number, MPN, brand, and barcode
- Filter by category, brand, vehicle compatibility, price, stock status, publication status, and tax class
- Sort by newest, oldest, name, price, stock, and sales
- Bulk publish, unpublish, archive, delete, update category, and export
- Duplicate product
- Safe archive instead of hard deletion when referenced by orders

### Product editor

The product editor should support:

#### Core product data

- Product name
- URL slug
- Short description
- Full description
- Product status: draft, published, archived
- Featured product flag
- Category and subcategory
- Brand
- Product type
- Tax class
- Warranty period
- Country of origin
- Manufacturer

#### Identification

- Internal SKU
- OEM part number
- MPN
- Manufacturer barcode
- EAN/UPC/GTIN when available
- HS code where relevant

Identifiers must be validated for uniqueness when the project’s business rules require it.

#### Pricing

- Cost price
- Selling price
- Compare-at price
- Percentage discount
- Fixed discount
- Tax-inclusive or tax-exclusive behavior based on the existing storefront rules
- Customer-visible savings
- Optional wholesale price if the storefront supports trade customers

Never trust client-submitted totals. Recalculate prices, discounts, tax, and stock-sensitive values on the server.

#### Media

- Required cover image
- Additional gallery images
- Image alt text
- Optional installation diagrams, manuals, or PDFs
- Preview before saving
- Validate file type and size
- Keep media references stable when editing a product

#### Physical and shipping details

- Weight
- Length
- Width
- Height
- Package dimensions
- Fragile or hazardous shipping flag
- Shipping class
- Installation required flag

#### Product options and variants

Do not model automotive options as saree colors.

Use variants only when a part has meaningful purchasable alternatives, such as:

- Brand
- Quality tier: genuine, OEM, aftermarket
- Position: front, rear, left, right
- Size
- Finish
- Pack quantity
- Engine or vehicle-specific version

Each purchasable variant should have:

- Stable variant ID
- Variant SKU
- Variant label
- Optional barcode
- Optional OEM/MPN
- Variant price override when needed
- Variant cost
- Variant stock
- Variant images
- Variant weight/dimensions
- Active/inactive state

If the Motolux project does not need purchasable variants, keep these fields hidden rather than forcing unnecessary complexity.

Stable variant IDs are required because cart lines, order items, stock movements, returns, and reports may reference them.

---

## 6. Vehicle fitment system

Vehicle compatibility is the core difference between Motolux and a normal ecommerce catalog.

### Vehicle entities

Create reusable vehicle records with:

- Make/brand
- Model
- Variant or trim
- Start year
- End year
- Fuel type
- Engine displacement
- Engine code where available
- Transmission
- Body type
- Drive type
- Country/market
- Active status

Use stable IDs for vehicles. Do not duplicate free-text vehicle names throughout products.

### Fitment mapping

Products must be attachable to one or many vehicles.

A fitment record should include:

- Product ID
- Variant ID when compatibility differs by variant
- Vehicle ID
- Fitment notes
- Position or side when relevant
- Engine/trim restrictions
- Installation notes
- Verification status
- Source or internal note

### Fitment workflows

Support:

- Add and remove compatible vehicles from the product editor
- Search vehicles by make, model, year, and engine
- Bulk import fitment mappings from CSV
- Bulk export fitment mappings
- Warn before removing fitment used by active products
- Show “fits your vehicle” information on product detail pages
- Preserve current customer vehicle-selection behavior if it already exists

### Fitment validation

At checkout and add-to-cart, validate compatibility when the customer has selected a vehicle.

Show a clear warning when:

- A part has no verified fitment
- The selected variant is not compatible
- The vehicle year is outside the supported range
- The product requires manual fitment confirmation

Do not silently claim a part fits a vehicle.

---

## 7. Categories and brands

### Categories

Support:

- Parent categories
- Subcategories
- Category image
- Category description
- SEO title and description
- Display order
- Published/draft state
- Featured category flag

Suggested automotive category examples:

- Engine parts
- Braking system
- Suspension and steering
- Electrical and lighting
- Filters and fluids
- Clutch and transmission
- Body and exterior
- Interior accessories
- Tyres and wheels
- Tools and maintenance

Do not assume these are final. Use the categories already present in the Motolux storefront when they exist.

Prevent category deletion while products or subcategories still reference it. Offer archive or reassignment instead.

### Brands

Support:

- Brand name
- Slug
- Logo
- Description
- Website
- Active status
- Display order

Products should reference a brand ID where possible rather than duplicating brand names.

---

## 8. Inventory and warehouses

### Inventory overview

Show:

- Available quantity
- Reserved quantity
- Incoming quantity
- Damaged quantity
- Reorder point
- Reorder quantity
- Warehouse/location
- Variant/SKU
- Last movement

Stock status:

- In stock
- Low stock
- Out of stock
- Backordered
- Discontinued

### Inventory actions

Support:

- Manual adjustment
- Receive stock
- Transfer between warehouses
- Mark damaged or lost stock
- Reserve and release stock
- Stocktake/cycle count
- Bulk stock import
- Export inventory
- Inventory movement history

Every stock-changing action must record:

- Product ID
- Variant ID if applicable
- SKU
- Previous quantity
- New quantity
- Quantity change
- Movement type
- Reason
- Warehouse
- Actor
- Timestamp
- Reference order or purchase order when applicable

### Warehouses

Support:

- Warehouse name
- Address
- Contact information
- Active status
- Default warehouse
- Stock by warehouse

If the storefront has only one location, implement the data model so a second location can be added later without rewriting product or order records.

---

## 9. Suppliers and purchase orders

Add supplier operations if the Motolux business purchases stock:

### Suppliers

- Supplier name
- Contact person
- Email and phone
- Address
- Tax/GST details where relevant
- Payment terms
- Active status
- Internal notes

### Purchase orders

Support statuses:

- Draft
- Sent
- Partially received
- Received
- Cancelled

Each purchase order should include:

- Supplier
- Warehouse
- Line items
- SKU/variant
- Ordered quantity
- Received quantity
- Unit cost
- Expected date
- Notes
- Attachments
- Audit history

Receiving stock must create inventory movements and update incoming/available quantities safely.

---

## 10. Order management

### Order list

Display:

- Order number
- Date
- Customer
- Payment status
- Fulfillment status
- Shipment status
- Item count
- Total
- Delivery location
- Vehicle selected at purchase, if applicable

Support search and filters for:

- Order number
- Customer name, email, and phone
- SKU, OEM number, or product name
- Date range
- Payment status
- Fulfillment status
- Return status
- Vehicle

### Order detail

Show:

- Customer and delivery details
- Billing details
- Vehicle information
- Order lines
- Variant and SKU
- Fitment result
- Quantity
- Price and tax
- Discount/coupon
- Payment information
- Shipment information
- Internal notes
- Customer-visible notes
- Status history
- Audit history

Order status examples:

- Pending payment
- Paid
- Processing
- Packed
- Shipped
- Delivered
- Cancelled
- Partially fulfilled
- On hold

Do not allow invalid status transitions. Add confirmation before cancellation, refund, or stock-affecting actions.

The server must recalculate and validate order totals and stock before finalizing checkout.

---

## 11. Returns, refunds, and replacements

Support:

- Return request list
- Return reason
- Product and variant
- Quantity
- Customer note
- Photos or attachments
- Return status
- Inspection result
- Refund amount
- Replacement order
- Restock or damaged disposition

Suggested statuses:

- Requested
- Approved
- Rejected
- Return shipment pending
- Received
- Inspected
- Refunded
- Replaced
- Closed

Refunds and restocking must be auditable and idempotent. Never refund the same return twice.

---

## 12. Customers

Show:

- Name
- Email
- Phone
- Addresses
- Saved vehicles
- Order count
- Lifetime value
- Last order
- Wishlist or saved parts where supported
- Account status

Customer detail should include:

- Order history
- Returns and refunds
- Support notes
- Saved vehicles
- Reviews and questions
- Marketing consent status

Protect personal data and avoid displaying more information than the admin role requires.

---

## 13. Reviews, questions, and fitment feedback

Support moderation for:

- Product reviews
- Star rating
- Customer questions
- Answers
- Fitment feedback
- Media attachments

Statuses:

- Pending
- Approved
- Rejected
- Hidden

Admins should be able to respond to questions without changing the original customer text.

---

## 14. Coupons and promotions

Support:

- Coupon code
- Percentage or fixed discount
- Minimum subtotal
- Maximum discount
- Expiration date
- Usage limit
- Per-customer usage limit
- Product/category/brand scope
- Vehicle scope when required
- Active/inactive state

Validate coupons on the server against the current cart and final order:

- Recalculate eligibility
- Recalculate discount
- Enforce expiry
- Enforce usage limits
- Prevent stacking unless explicitly supported
- Never trust discount values sent from the client

---

## 15. Homepage and storefront content

Manage:

- Hero banners
- Promotional strips
- Featured categories
- Featured brands
- Recommended parts
- Announcement bar
- FAQ entries
- Installation/service content
- SEO metadata

Every content record should support:

- Title
- Subtitle or description
- Image/media
- Link
- Display order
- Published state
- Schedule where useful

Keep content management separate from product and inventory data.

---

## 16. Reports and exports

Provide CSV exports for:

- Products
- Variants
- Vehicle fitment
- Inventory
- Inventory movements
- Orders
- Customers
- Returns
- Suppliers
- Purchase orders
- Coupons

Dashboard reports should include:

- Sales by date
- Sales by category
- Sales by brand
- Sales by vehicle make/model
- Top parts
- Low-stock and dead-stock report
- Gross margin when cost price exists
- Return rate
- Fulfillment time

Exports must respect admin permissions and avoid exposing secrets.

---

## 17. Settings

Manage only settings that already belong to this project:

- Store name and contact details
- Currency
- Tax configuration
- Shipping configuration
- Return policy
- Warranty policy
- Order number format
- Inventory thresholds
- Notification settings
- Payment/shipping integration status
- Default warehouse
- Admin preferences

Do not put credentials or API keys into editable storefront settings. Use the platform’s secret/integration management for credentials.

---

## 18. API and data rules

Use the project’s existing API conventions. If new endpoints are needed, keep them resource-oriented and protected.

Suggested resources:

```text
/api/admin/summary
/api/admin/products
/api/admin/products/:id
/api/admin/products/:id/variants
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

Rules:

- Validate all payloads on the server.
- Use stable IDs for products, variants, vehicles, orders, and fitments.
- Do not silently fall back to fake data when the database or API fails.
- Use explicit error messages.
- Use atomic or transactional operations for checkout, stock deduction, refund, and receiving stock when supported by the existing database.
- Preserve legacy records when adding new fields.
- Do not delete products referenced by orders; archive them instead.
- Avoid N+1 queries in admin lists.
- Add pagination or safe limits to large collections.
- Keep response shapes consistent between list and detail APIs.

---

## 19. UI and interaction requirements

Match the existing Motolux storefront branding while making the admin more operational and information-dense.

Required states:

- Loading
- Empty
- Error
- Saving
- Saved
- Validation error
- Permission denied
- Not found
- Destructive action confirmation

Forms must:

- Use clear labels
- Preserve entered values after validation errors
- Show inline validation
- Disable duplicate submissions
- Confirm destructive actions
- Support keyboard navigation
- Provide accessible labels and focus states

Lists should:

- Keep primary actions visible
- Use sticky table headers when useful
- Provide filters that can be cleared
- Show useful empty-state guidance
- Display stock and status with readable labels, not color alone

---

## 20. Implementation phases

### Phase 1 — Foundation

- Inspect existing project and database
- Add protected admin shell
- Add authentication and role checks
- Add dashboard summary
- Add product list and product editor
- Add category and brand management

### Phase 2 — Automotive catalog

- Add SKU/OEM/MPN fields
- Add reusable vehicle records
- Add product fitment mapping
- Add customer vehicle visibility on product pages
- Add product variants where the business requires them

### Phase 3 — Operations

- Add inventory movements
- Add warehouses
- Add suppliers
- Add purchase orders
- Add order detail and status history
- Add returns and refunds

### Phase 4 — Growth and reporting

- Add coupons and promotions
- Add reviews and questions
- Add content management
- Add exports and reports
- Add audit log
- Add bulk imports

Do not build every phase as a fake screen at once. Finish each phase with working persistence, validation, and UI behavior before moving to the next phase.

---

## 21. Acceptance criteria

### Admin access

- Unauthenticated users cannot access admin data or screens.
- Every admin API endpoint enforces authentication and authorization.
- Viewer users cannot mutate data.

### Catalog

- An admin can create, edit, publish, archive, duplicate, and search products.
- SKU and OEM/MPN identifiers are handled consistently.
- Product images and documents persist correctly.
- Product and variant IDs remain stable after edits.

### Fitment

- An admin can create reusable vehicles.
- An admin can map products or variants to compatible vehicles.
- A customer-selected vehicle can be checked against product fitment.
- The system never silently claims compatibility when fitment is unknown.

### Inventory

- Stock is visible at product and variant level.
- Stock changes create movement records.
- Checkout cannot oversell stock.
- Warehouse transfers and receiving update stock safely.

### Orders

- Admins can search and filter orders.
- Order details show product, variant, SKU, vehicle, payment, shipping, and status history.
- Invalid status transitions are blocked.
- Refunds and returns are idempotent and auditable.

### Data integrity

- Existing storefront behavior remains intact.
- Existing records are not silently deleted or rewritten.
- Errors are explicit and visible.
- No secrets are committed or exposed.

### Verification

Before declaring the admin complete:

1. Run the project’s build and type checks.
2. Run available tests.
3. Verify login, logout, permission restrictions, product CRUD, fitment CRUD, inventory movement, checkout stock validation, order status changes, and exports.
4. Verify desktop and mobile layouts.
5. Check browser and server logs for new errors.
6. Test empty, error, validation, and permission-denied states.
7. Confirm the storefront and admin use the same live data.

---

## 22. Replit Agent instruction

Implement this admin side directly in the existing Motolux project.

Do not copy saree-specific fields such as color palettes, fabric, blouse details, saree length, or saree galleries. Translate the proven admin patterns into automotive concepts: SKU, OEM/MPN, brands, vehicle compatibility, fitment, warehouses, suppliers, purchase orders, parts inventory, shipping, returns, and warranty.

Prefer working features over placeholder screens. Keep the existing architecture, use the existing database, preserve legacy data, and ask before making any irreversible data migration or destructive reset.
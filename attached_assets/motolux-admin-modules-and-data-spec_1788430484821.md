# Motolux Admin Panel: Modules and Data Specification

This document describes the admin structure used by the current storefront, rewritten as a product specification for **Motolux**. Use Motolux names, products, branding, and business rules when implementing it. Do not copy Bawari Banno text or saree-specific content.

## 1. Admin panel structure

The admin area should be a protected, responsive dashboard with:

- A login screen.
- A left sidebar on desktop.
- A compact menu or horizontal navigation on mobile.
- A top header showing the current module.
- A link to open the Motolux storefront.
- A sign-out action.
- One shared loading, error, confirmation, and success-message pattern.
- Search, filters, sorting, pagination or scrolling tables where needed.

### Recommended navigation order

1. Overview
2. Products & Stock
3. Inventory History
4. Orders
5. Customers
6. Reviews
7. Categories
8. Hero Slides
9. Announcement Bar
10. Coupons
11. Store Settings

The modules below are the actual data and behavior each screen should provide.

---

## 2. Admin authentication

### Login screen

Show:

- Motolux logo/name.
- Admin email field.
- Admin password field.
- Sign-in button.
- Invalid-credentials error.
- Loading state while signing in.

### Session behavior

- On opening `/admin`, call `GET /api/admin/me`.
- If the session is valid, show the dashboard.
- If not valid, show the login form.
- On successful login, set a signed HttpOnly admin cookie.
- On sign out, call `POST /api/admin/logout` and clear the cookie.
- Every admin data endpoint must reject unauthenticated requests.

Suggested endpoints:

```text
POST /api/admin/login
GET  /api/admin/me
POST /api/admin/logout
```

The browser must not decide whether the admin is authenticated. The server must validate the session on every protected request.

---

## 3. Overview dashboard

The Overview screen is the operational summary of Motolux.

### KPI cards

Show four prominent cards:

| KPI | Meaning |
| --- | --- |
| Total revenue | Sum of order totals |
| Total orders | Number of orders in the selected data set |
| Customers | Number of registered customers |
| Pending orders | Orders waiting for admin action |

Use the business currency configured for Motolux.

### Revenue and order trend

Show a six-month trend:

- Month label.
- Revenue for that month.
- Number of orders for that month.
- A bar, line, or compact chart.

### Order status summary

Show counts and progress bars for:

- Pending.
- Processing.
- Delivered.
- Cancelled.

If Motolux uses additional states such as approved, shipped, rejected, or returned, include them in the same summary.

### Recent orders

Show the latest six orders with:

- Order number.
- Customer name.
- Order date.
- Total amount.
- Current order status.
- Link/button to open the full order.

### Inventory alerts

Show products whose stock is at or below the low-stock threshold:

- Product name.
- Current stock.
- “Low stock” or “Out of stock” label.
- Link to Products & Stock.

The threshold should be configurable; the current pattern uses five units for dashboard alerts.

### Catalog mix

Show the number of products in each category, ranked by count.

### Optional catalog sync

If Motolux imports an initial catalog, provide a deliberate “Sync catalog” action. It should show what was imported and should not silently overwrite admin edits.

Suggested endpoint:

```text
GET /api/admin/analytics
POST /api/admin/seed              # optional initial import only
```

---

## 4. Products & Stock

This is the main catalog-management module.

### Product list

Show a searchable, filterable list of all product records.

Each product row/card should show:

- Product image.
- Product name.
- Stable product ID/SKU.
- Category.
- Optional subcategory.
- Product type or material.
- Selling price.
- Total stock.
- Published/unpublished state.
- Featured state.
- Low-stock or out-of-stock state.
- Edit action.
- Delete action.

### Product list controls

Provide:

- Search by name, ID/SKU, material, or category.
- Category filter.
- Stock filter:
  - All.
  - In stock.
  - Low stock.
  - Out of stock.
- Sort by:
  - Newest.
  - Oldest.
  - Name ascending/descending.
  - Price low/high.
  - Stock low/high.
- Clear filters.
- Add new product.

### Product editor data

The product editor should support:

#### Identity and classification

- Product ID/SKU.
- Product name.
- Category.
- Subcategory.
- Product type.
- Brand or collection, if needed by Motolux.

#### Pricing

- Original/MRP price.
- Discount type: percentage or fixed amount.
- Discount value.
- Derived selling price.
- Optional tax information.

Do not trust a price sent from the browser during checkout. Recalculate it on the server.

#### Media

- Cover image.
- Additional image URLs or uploaded images.
- Image ordering.
- Alt text.
- Optional product video.

#### Product information

Use Motolux-specific fields, for example:

- Description.
- Material/specification.
- Dimensions or size.
- Weight.
- Care/use instructions.
- Country of origin.
- Warranty information.
- Delivery information.

Do not keep saree-only fields such as blouse details or saree length unless Motolux actually sells those products.

#### Visibility and merchandising

- Published on storefront.
- Featured product.
- New arrival.
- Trending.
- Bestseller.
- Optional manual display order.

#### Variants

If a Motolux product has colors, sizes, models, or configurations, each variant should have:

```ts
{
  id: string,
  optionName: string,
  optionValue: string,
  price?: number,
  stock: number,
  image?: string,
  images?: string[]
}
```

Requirements:

- Every variant has a stable ID.
- Variant values cannot be duplicated within one product.
- Each variant has its own stock.
- Each variant may have its own images.
- The product’s total stock is derived from its variants.
- Cart lines and order lines store the selected variant ID.
- Removing a variant must be deliberate because it affects existing cart/order references.

### Product actions

- Create.
- Edit.
- Publish/unpublish.
- Mark/unmark featured.
- Update stock.
- Delete with confirmation.
- View the storefront version.

Suggested endpoints:

```text
GET    /api/admin/products
POST   /api/admin/products
PUT    /api/admin/products/:id
DELETE /api/admin/products/:id
```

---

## 5. Inventory History

This module is the audit trail for stock changes. It is separate from the current stock value.

### Filters

- Product.
- Event type.
- From date.
- To date.
- Clear filters.

### Event types

At minimum:

- Purchase/sale: stock decreases.
- Manual adjustment: admin correction or restock.

Motolux may also add:

- Return.
- Cancellation restore.
- Damaged stock.
- Supplier receipt.
- Transfer between locations.

### Inventory table

Show:

- Date and time.
- Product.
- Variant/configuration.
- Event type.
- Quantity change.
- Stock before.
- Stock after.
- Related order number.
- Buyer name, when caused by an order.
- Buyer phone/email, when available.
- Order status/payment status, when available.
- Edit action for manual records.
- Delete action with confirmation.

### Inventory rules

- Every manual adjustment updates current stock and creates a history event.
- Every checkout creates a negative inventory event.
- Every cancellation/refund that restores stock creates a positive event.
- The stock-after value should be stored for auditability.
- The server, not the browser, performs stock changes.

Suggested endpoints:

```text
GET    /api/admin/inventory
POST   /api/admin/inventory
PUT    /api/admin/inventory/:id
DELETE /api/admin/inventory/:id
```

---

## 6. Orders

Orders are the fulfillment and payment operations screen.

### Order list controls

Provide:

- Search by order number, customer name, phone, or email.
- Order-status filter.
- Payment-status filter.
- Date-from filter.
- Date-to filter.
- Sort newest/oldest.
- Clear filters.
- Add manual order.
- Export paid orders.

### Order list data

Show:

- Order number.
- Customer.
- Phone/email.
- Item count.
- Total.
- Order status.
- Payment status.
- Payment method.
- Created date.

### Order detail view

Show:

#### Customer

- Name.
- Phone.
- Email.

#### Delivery

- Recipient name.
- Address line 1.
- Address line 2.
- City.
- State.
- Postal code.
- Delivery phone.

#### Items

For each item:

- Product image.
- Product name.
- Product ID/SKU.
- Variant/configuration.
- Quantity.
- Unit price.
- Line total.

#### Money summary

- Subtotal.
- Shipping charge.
- Coupon/discount.
- Final total.

#### Payment

- Payment status.
- Payment method.
- Transaction/reference ID.
- Optional payment notes.

#### Timeline

Show status history:

- Status.
- Date/time of change.

### Order lifecycle

Recommended status flow:

```text
pending → approved → processing → shipped → delivered
```

Allow:

- Cancel before delivery.
- Reject when appropriate.
- Mark payment as paid.
- Manually change status with confirmation.

Use Motolux’s actual fulfillment process if it differs.

### Order actions

- Approve.
- Start processing.
- Mark shipped.
- Mark delivered.
- Cancel.
- Mark payment paid.
- Edit manual/admin-created orders.
- Delete with confirmation.

Deleting a checkout-created order must restore reserved stock exactly once and record that restoration in inventory history.

Suggested endpoints:

```text
GET    /api/admin/orders
POST   /api/admin/orders
PUT    /api/admin/orders/:id
PATCH  /api/admin/orders/:id
DELETE /api/admin/orders/:id
```

---

## 7. Customers

This is the customer directory and customer 360 view.

### Customer summary cards

Show:

- Registered customers.
- Customers with at least one order.
- Total customer sales.

### Customer list controls

Provide:

- Search by name, email, or phone.
- City filter.
- State filter.
- Activity filter.
- Paid-customer filter.
- Sort by joined date, activity, order count, or total spent.
- Ascending/descending order.
- Add customer.
- View details.
- Edit.
- Delete with confirmation.

### Customer list columns

- Name.
- Email.
- Phone.
- Order count.
- Total spent.
- Joined date.
- Last login/activity, if available.
- Verification state, if available.

### Customer detail view

Show a profile card with:

- Avatar/initials.
- Full name.
- Email.
- Phone.
- City/state.
- Registration date.
- Last login/activity.
- Verification state.
- Wishlist count.

Show purchase history with:

- Order number.
- Date.
- Item count.
- Order total.
- Order status.
- Payment status.
- Link to open the order.

Suggested endpoints:

```text
GET    /api/admin/customers
GET    /api/admin/customers/:id
POST   /api/admin/customers
PUT    /api/admin/customers/:id
DELETE /api/admin/customers/:id
```

Protect personal data. Only authorized admins should see customer contact and address details.

---

## 8. Reviews

Reviews are moderated before they appear publicly.

### Review list controls

- Search reviews.
- Filter by moderation status:
  - Pending.
  - Approved.
  - Rejected.
- Optional filter by rating.
- Add review manually.

### Review list data

Show:

- Review title.
- Short review text.
- Reviewer display name.
- Product.
- Star rating.
- Moderation status.
- Edit action.
- Delete action.

### Review editor

Fields:

- Product.
- Reviewer display name.
- Rating from 1 to 5.
- Review title.
- Review body.
- Moderation status.
- Attached photos/videos.

### Review actions

- Approve.
- Reject.
- Edit.
- Remove attached media.
- Delete review and associated media.

Only approved reviews should be returned by the public storefront endpoint.

Suggested endpoints:

```text
GET    /api/admin/reviews
POST   /api/admin/reviews
PATCH  /api/admin/reviews/:id
PUT    /api/admin/reviews/:id
DELETE /api/admin/reviews/:id
```

---

## 9. Categories

Categories control catalog navigation and product organization.

### Category hierarchy

Support:

- Parent categories.
- Subcategories.
- Product counts per category.
- Product counts per subcategory.

### Category list data

Show:

- Category image.
- Category name/label.
- Stable slug.
- Description.
- Published state.
- Display order.
- Number of child subcategories.
- Number of assigned products.

For each parent category, show its subcategories and assigned products.

### Category editor

Fields:

- Category name.
- Slug.
- Parent category, optional.
- Description.
- Image.
- Display order.
- Published state.

### Category actions

- Add category.
- Add subcategory.
- View category details.
- Edit.
- Reorder by drag and drop or explicit order.
- Publish/unpublish.
- Delete with relationship validation.

Do not allow deletion while products or subcategories still reference the category. Ask the admin to reassign or remove those relationships first.

Suggested endpoints:

```text
GET    /api/admin/categories
POST   /api/admin/categories
PUT    /api/admin/categories/:id
DELETE /api/admin/categories/:id
PUT    /api/admin/categories/reorder
```

---

## 10. Hero Slides

This module manages the large promotional visuals on the Motolux storefront homepage.

### Slide data

Each slide should contain:

- Title.
- Subtitle.
- Image.
- Accessible alt text.
- Button label, if used.
- Button link, if used.
- Display order.
- Published state.

### Screen behavior

Show each slide as a visual card with:

- Image preview.
- Title and subtitle.
- Published/unpublished label.
- Order position.
- Edit action.
- Delete action.
- Drag handle or reorder controls.

### Actions

- Add slide.
- Edit slide.
- Reorder slides.
- Publish/unpublish.
- Delete slide.

The storefront should only render published slides sorted by display order.

Suggested endpoints:

```text
GET    /api/admin/heroes
POST   /api/admin/heroes
PUT    /api/admin/heroes/:id
DELETE /api/admin/heroes/:id
PUT    /api/admin/heroes/reorder
```

---

## 11. Announcement Bar

This module manages the scrolling or fixed message displayed at the top of the Motolux storefront.

### Announcement data

Each record should contain:

- Message text.
- Active/inactive state.
- Display order.
- Created/updated timestamps.

### Screen behavior

Show:

- A live preview of the active message.
- Add announcement form.
- All announcement records.
- Active/inactive state.
- Edit action.
- Delete action.

### Actions

- Add.
- Edit.
- Activate/deactivate.
- Delete.
- Optional reorder.

The storefront should only show active announcements.

Suggested endpoints:

```text
GET    /api/admin/announcements
POST   /api/admin/announcements
PUT    /api/admin/announcements/:id
DELETE /api/admin/announcements/:id
```

---

## 12. Coupons

Coupons manage store promotions and checkout discounts.

### Coupon summary cards

Show:

- Total coupons.
- Active coupons.
- Total catalog products.

### Coupon data

Each coupon should contain:

- Coupon code.
- Internal/customer-facing label.
- Discount type:
  - Percentage.
  - Fixed amount.
- Discount value.
- Minimum subtotal.
- Product scope:
  - Entire catalog.
  - Selected products.
  - Optional selected categories.
- Product/category IDs included in the scope.
- Start date, optional.
- Expiration date, optional.
- Usage limit, optional.
- Per-customer usage limit, optional.
- Active/inactive state.

### Coupon list card

Show:

- Code.
- Active/inactive badge.
- Discount description.
- Discount amount.
- Minimum subtotal.
- Scope.
- Expiration/availability.
- Edit action.
- Activate/deactivate action.
- Delete action.

### Coupon editor behavior

When selecting specific products:

- Search products by name or ID/SKU.
- Browse products by category and subcategory.
- Expand/collapse groups.
- Show selected count.
- Select/deselect individual products.

### Rules

- Normalize codes consistently, usually uppercase.
- Validate expiration and minimum subtotal on the server.
- Apply discounts only to eligible products.
- Recalculate discounts during order creation.
- Do not trust a discount total sent by the browser.

Suggested endpoints:

```text
GET    /api/admin/coupons
POST   /api/admin/coupons
PUT    /api/admin/coupons/:id
DELETE /api/admin/coupons/:id
POST   /api/coupons/validate
```

---

## 13. Store Settings

Use one settings record for checkout-wide configuration.

### Current core settings

- Shipping charge.
- Free-shipping threshold.

### Recommended Motolux settings

Add fields only when needed:

- Currency.
- Tax rate.
- Delivery regions.
- Estimated delivery text.
- Return-window text.
- Contact phone/email.
- Store address.
- Social links.
- Default low-stock threshold.
- Order numbering prefix.

### Screen behavior

Show:

- Whether a saved settings record exists.
- Editable settings form.
- Create/save button.
- Reset/delete-to-defaults action with confirmation.

Changing settings should affect future checkout calculations and storefront messaging. It should not rewrite old order totals.

Suggested endpoints:

```text
GET    /api/admin/settings
POST   /api/admin/settings
PUT    /api/admin/settings
DELETE /api/admin/settings
```

---

## 14. Core data relationships

The admin modules should share stable IDs and references:

```text
Category
  └── Product
        └── Product Variant
              └── Cart Line
              └── Order Item
              └── Inventory Movement

Customer
  └── Orders
  └── Reviews
  └── Wishlist

Coupon
  └── Product/category eligibility
```

Important rules:

- Products reference category IDs/slugs, not only display labels.
- Orders store a snapshot of product name, image, price, and selected variant at purchase time.
- Inventory movements reference product and variant IDs.
- Customers are linked to orders by a server-verified customer ID.
- Deleting a product should be blocked or handled carefully if order history still references it.
- Historical orders must remain readable even if the live product is later edited.

---

## 15. Shared API and UI requirements

### API behavior

- Return JSON consistently.
- Return clear error messages and correct HTTP status codes.
- Require admin authentication on every `/api/admin/*` endpoint except login.
- Validate all IDs, numbers, dates, and enums on the server.
- Return `404` for missing records.
- Return `409` for stock conflicts or relationship conflicts.
- Use `401` for missing/invalid admin sessions.

### UI behavior

- Show loading states while data is fetched.
- Show an empty state when no records exist.
- Confirm destructive actions.
- Disable save buttons while a request is running.
- Refresh the affected list after create/update/delete.
- Keep tables horizontally scrollable on small screens instead of breaking the layout.
- Use readable stacked cards where a dense table is not usable on mobile.

### Audit and safety

- Never expose admin credentials in frontend code.
- Never calculate final order totals only on the client.
- Never decrement inventory without a corresponding movement record.
- Never delete categories with active product/subcategory relationships.
- Never remove customer or order history accidentally through a catalog reset.

---

## 16. Suggested Motolux implementation phases

### Phase 1: required operations

1. Admin login/session.
2. Overview dashboard.
3. Products & Stock.
4. Categories.
5. Orders.
6. Inventory History.
7. Store Settings.

### Phase 2: customer and conversion features

1. Customers.
2. Reviews.
3. Coupons.
4. Announcement Bar.
5. Hero Slides.

### Phase 3: hardening

1. Role-based admin permissions.
2. Audit log for admin changes.
3. Pagination and server-side filtering.
4. Image upload/storage instead of URL-only fields.
5. Real payment status integration.
6. Return/refund workflow.
7. Multi-location inventory, if Motolux needs it.

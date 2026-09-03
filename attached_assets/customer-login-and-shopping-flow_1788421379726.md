# Customer Login → Shopping Flow

This is the customer-account pattern used in Bawari Banno and a small guide for reusing it in Motolix.

## 1. User flow

```text
Visitor opens the store
        ↓
Browse products and add items to cart
        ↓
User clicks “Proceed to checkout”
        ↓
Frontend checks GET /api/auth/me
        ↓
 ┌───────────────────────┐
 │ Already logged in?    │
 └──────────┬────────────┘
       Yes  │  No
            │
       Continue       Open login modal
       checkout              ↓
                    Enter phone number
                            ↓
                    Request one-time code
                            ↓
                    Verify phone + OTP
                            ↓
              New customer? Complete name/email
                            ↓
                    Signed session cookie
                            ↓
                    Continue shopping/checkout
```

Browsing is public. A customer account is required for checkout, profile, wishlist, and order history.

## 2. Frontend pieces

### `CustomerAuthProvider`

Wrap the storefront with one auth provider:

```tsx
<CustomerAuthProvider>
  <CartProvider>
    <App />
  </CartProvider>
</CustomerAuthProvider>
```

The provider stores:

```ts
type Customer = {
  _id?: string;
  phone: string;
  name?: string;
  email?: string;
};
```

It exposes:

```ts
const {
  customer,
  checking,
  authenticated,
  openAuth,
  closeAuth,
} = useCustomerAuth();
```

- `checking`: the app is checking the existing session.
- `customer`: the logged-in customer or `null`.
- `authenticated`: `Boolean(customer)`.
- `openAuth(callback?)`: opens login, or immediately runs the callback when already logged in.
- `closeAuth()`: closes the login modal.

On initial page load, the provider calls `GET /api/auth/me`. This lets a returning customer stay logged in without showing the login form again.

## 3. Login form sequence

### Step A: request OTP

```ts
await fetch("/api/auth/send-otp", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({ phone }),
});
```

The phone number is normalized to the final 10 digits and validated.

### Step B: verify OTP

```ts
const response = await fetch("/api/auth/verify", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({ phone, otp }),
});

const { customer } = await response.json();
```

The server:

1. Validates the phone and OTP.
2. Finds the customer by phone.
3. Creates the customer if this is the first login.
4. Sends a signed, HttpOnly customer cookie.

If the customer does not have profile details yet, show the name/email form:

```ts
await fetch("/api/auth/profile", {
  method: "PUT",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({ name, email }),
});
```

After verification or profile completion, update the provider state and close the modal.

## 4. Protecting checkout

The cart checks the session before sending the order:

```ts
async function proceedToCheckout() {
  const session = await fetch("/api/auth/me", {
    credentials: "same-origin",
  });

  if (!session.ok) {
    openAuth();
    return;
  }

  await submitOrder();
}
```

In the current Bawari Banno implementation, the login modal is opened without a callback, so the customer clicks **Proceed to checkout** again after logging in.

For Motolix, automatically continue the interrupted action:

```ts
function proceedToCheckout() {
  openAuth(() => {
    void submitOrder();
  });
}
```

`openAuth` runs the callback immediately for an already-authenticated customer and saves it temporarily for a customer who must log in first.

## 5. Create the order on the server

The frontend must not be trusted for customer identity, price, stock, shipping, or discounts.

```ts
await fetch("/api/inventory/purchase", {
  method: "POST",
  headers: { "content-type": "application/json" },
  credentials: "same-origin",
  body: JSON.stringify({
    items: [
      {
        productId: "product-123",
        variantId: "optional-variant-id",
        quantity: 1,
      },
    ],
    couponCode: "OPTIONAL_CODE",
  }),
});
```

The server:

1. Reads and verifies the customer cookie.
2. Rejects the request with `401` if there is no valid customer session.
3. Reloads products and variants from the database.
4. Validates stock and selected variants.
5. Recalculates subtotal, shipping, discount, and total.
6. Decrements inventory.
7. Saves the order with the authenticated customer ID.
8. Returns an order ID.

## 6. API contract

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/auth/me` | `GET` | Check the current customer session |
| `/api/auth/send-otp` | `POST` | Start phone verification |
| `/api/auth/verify` | `POST` | Verify OTP and create the session |
| `/api/auth/profile` | `PUT` | Save first-login customer details |
| `/api/auth/logout` | `POST` | Clear the customer session |
| `/api/auth/wishlist` | `GET`/`POST` | Read or update saved products |
| `/api/auth/orders` | `GET` | Read orders for the signed-in customer |
| `/api/inventory/purchase` | `POST` | Validate and create an order |

All same-origin requests should use:

```ts
credentials: "same-origin"
```

## 7. Session security

Use a server-created session cookie rather than storing a customer ID in local storage.

Recommended cookie settings:

```http
Set-Cookie: motolix_customer=<signed-session>;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Path=/;
  Max-Age=2592000
```

- Sign the cookie with a server-only secret.
- Check the signature and expiration on every protected request.
- Load the customer from the database using the verified server-side ID.
- Never trust a customer ID sent by the browser.
- Use a real SMS/email OTP provider in production. The Bawari Banno demo OTP is only for local testing.

## 8. Files to copy as a pattern

| Bawari Banno file | Motolix responsibility |
| --- | --- |
| `src/components/site/CustomerAuthContext.tsx` | Auth provider, modal, OTP steps, session refresh |
| `src/components/site/CustomerGate.tsx` | Guard for account-only pages |
| `src/components/site/CartDrawer.tsx` | Login gate before checkout |
| `src/routes/profile.tsx` | Customer profile, logout, order history |
| `src/lib/admin-api.ts` | Auth endpoints, signed cookie, protected order creation |

## 9. Minimal Motolix implementation order

1. Add a `customers` table/collection with phone, name, email, and timestamps.
2. Add `POST /auth/send-otp`.
3. Add `POST /auth/verify`.
4. Set a signed HttpOnly session cookie after verification.
5. Add `GET /auth/me`.
6. Add a frontend auth provider that calls `/auth/me` on load.
7. Keep product browsing public.
8. Call `openAuth(() => submitOrder())` at checkout.
9. Recalculate the order on the server and attach the verified customer ID.
10. Add logout by clearing the cookie.

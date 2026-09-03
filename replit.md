# Motoluxe Autocare Storefront

## Run locally in Replit

This is a React + TypeScript ecommerce storefront using TanStack Start and Vite.

```sh
bun install --frozen-lockfile
bun run dev
```

The Replit workflow is configured as **Start application** and serves the app on port `5000`.

## Project scope

The storefront keeps public product browsing and cart selection in the existing
React UI. Checkout uses the server API and MongoDB:

- `MONGODB_URI` and `SESSION_SECRET` are read from Replit Secrets.
- Customers sign in with their full name, phone number, and one-time code.
- Successful verification upserts the normalized phone and full name into the
  `customers` collection.
- Development requests return a clearly labeled OTP because no SMS provider is
  configured yet. A real SMS or email provider should be connected before
  production launch.
- Sessions use a signed, HttpOnly cookie and a MongoDB session record.
- Orders are validated against the static catalog on the server and store the
  authenticated customer ID plus name, phone, and delivery snapshot in the
  `orders` collection.
- The profile route reads customer details and that customer's order history from
  MongoDB. Authenticated wishlist slugs are stored on the customer record and
  synced through the account API; signed-out wishlist items remain browser-local.

The production build uses the Node Nitro preset because the MongoDB Node driver
requires a Node server runtime.

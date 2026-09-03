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
- Customers sign in with their full name and phone number.
- Successful sign-in upserts the normalized phone and full name into the
  `customers` collection and creates a MongoDB-backed session.
- Sessions use a signed, HttpOnly cookie and a MongoDB session record.
- Orders are validated against the static catalog on the server and store the
  authenticated customer ID plus name, phone, and delivery snapshot in the
  `orders` collection.
- The profile route reads customer details and that customer's order history from
  MongoDB. Authenticated wishlist slugs are stored on the customer record and
  synced through the account API; signed-out wishlist items remain browser-local.
- The admin foundation is available at `/admin`. The first owner account is
  created once at `/admin/setup`, stored in the MongoDB `admin` collection with
  a salted password hash, and authenticated with a separate signed HttpOnly
  admin session.

The production build uses the Node Nitro preset because the MongoDB Node driver
requires a Node server runtime.

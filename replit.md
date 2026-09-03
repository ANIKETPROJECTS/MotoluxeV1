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
- Customers sign in with a phone number and one-time code.
- Development requests return a clearly labeled OTP because no SMS provider is
  configured yet. A real SMS or email provider should be connected before
  production launch.
- Sessions use a signed, HttpOnly cookie and a MongoDB session record.
- Orders are validated against the static catalog on the server and store the
  authenticated customer ID plus delivery snapshot.

The production build uses the Node Nitro preset because the MongoDB Node driver
requires a Node server runtime.

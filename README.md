# ShopDemo - Ecommerce Test Application

A fully functional dummy ecommerce frontend built for QA testing with Playwright. All backend data is mocked using [MSW (Mock Service Worker)](https://mswjs.io/) — no real server required.

## Prerequisites

- Node.js 18+
- npm

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Or build and start production server
npm run build
npm start
```

The app runs on `http://localhost:3000` by default.

### Custom Port

```bash
PORT=4000 npm run dev
PORT=4000 npm start
```

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Product listing with search, filter by category, and sort by price |
| `/products/:id` | Product detail page with add-to-cart |
| `/cart` | Shopping cart with quantity controls |
| `/checkout` | Checkout form with shipping and payment validation |
| `/order-confirmation?orderId=...` | Order confirmation page |
| `/login` | Login page (email + password) |
| `/signup` | Signup page (name + email + password + confirm password) |

## Features Available for Testing

### Product Listing (`/`)
- Grid display of 14 products across 4 categories
- **Search**: Type in the search bar to filter products by name (debounced 300ms)
- **Category filter**: Filter by Electronics, Clothing, Home, or Books
- **Sort**: Sort by price (low-to-high or high-to-low)
- Product count updates dynamically
- Empty state when no products match
- Loading skeleton while fetching

### Product Detail (`/products/:id`)
- Product image, name, description, price, category, stock status
- Quantity selector
- "Add to Cart" button (disabled for out-of-stock items)
- Success notification after adding to cart
- 404 state for invalid product IDs

### Shopping Cart (`/cart`)
- List of cart items with images, names, prices
- Increase/decrease quantity buttons
- Remove item button
- Running total
- "Proceed to Checkout" button
- Empty cart message with link back to products

### Checkout (`/checkout`)
- **Shipping fields**: First Name, Last Name, Email, Address, City, State, Zip Code
- **Payment fields**: Name on Card, Card Number, Expiry Date (MM/YY), CVV
- Client-side validation with inline error messages
- Server-side validation on submit
- Redirects to order confirmation on success
- Empty cart redirect

### Validation Rules
| Field | Rule |
|-------|------|
| First Name, Last Name, Address, City, State, Name on Card | Required |
| Email | Required, valid email format |
| Zip Code | Required, exactly 5 digits |
| Card Number | Required, exactly 16 digits (spaces allowed) |
| Expiry Date | Required, MM/YY format |
| CVV | Required, 3 or 4 digits |

### Login (`/login`)
- Email + password fields
- Client-side validation (required + email format)
- Server-side credential check against `src/data/users.json`
- On success: stores session token in `localStorage` under key `shopdemo_auth_token`, redirects to `/`
- On failure: shows inline field errors or a general "Invalid email or password" message
- Link to `/signup` for new users

### Signup (`/signup`)
- Name + email + password + confirm password fields
- Client-side validation: all fields required, email format, password ≥ 6 chars, confirm must match password
- Server-side validation: duplicate email detection against `src/data/users.json` (plus runtime-registered users)
- On success: user is automatically logged in, redirects to `/`
- Link to `/login` for existing users

### Signup Validation Rules
| Field | Rule |
|-------|------|
| Name | Required |
| Email | Required, valid email format, must not already exist |
| Password | Required, minimum 6 characters |
| Confirm Password | Required, must match password |

## API Endpoints (Mocked via MSW)

All endpoints are intercepted by MSW in the browser — no real HTTP requests leave the app.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/products?search=&category=&sort=` | List products with optional filters |
| `GET` | `/api/products/:id` | Get single product |
| `GET` | `/api/cart` | Get current cart |
| `POST` | `/api/cart` | Add item (`{ productId, quantity }`) |
| `PATCH` | `/api/cart/:id` | Update quantity (`{ quantity }`) |
| `DELETE` | `/api/cart/:id` | Remove item from cart |
| `POST` | `/api/checkout` | Submit order (`{ shipping, payment }`) |
| `POST` | `/api/auth/signup` | Create user (`{ name, email, password }`) — 201 with `{ user, token }` on success, 400 with `{ errors }` on validation failure |
| `POST` | `/api/auth/login` | Log in (`{ email, password }`) — 200 with `{ user, token }` on success, 401 `{ error }` on bad credentials |
| `POST` | `/api/auth/logout` | Clear server-side session (requires `Authorization: Bearer <token>` header) |
| `GET` | `/api/auth/me` | Get current user (requires `Authorization: Bearer <token>` header) — 401 if not authenticated |

### Sort Options
- `price_asc` — Price: Low to High
- `price_desc` — Price: High to Low

### Categories
`electronics`, `clothing`, `home`, `books`

## `data-testid` Reference

### Navigation
| Selector | Element |
|----------|---------|
| `navbar` | Navigation bar |
| `cart-link` | Cart link in navbar |
| `cart-count` | Cart item count badge |

### Product Listing
| Selector | Element |
|----------|---------|
| `search-input` | Search text input |
| `category-filter` | Category dropdown |
| `sort-select` | Sort dropdown |
| `product-count` | Product count text |
| `product-grid` | Product grid container |
| `product-card-{id}` | Individual product card (e.g., `product-card-prod-001`) |
| `no-products` | No products found message |
| `product-grid-loading` | Loading skeleton |

### Product Detail
| Selector | Element |
|----------|---------|
| `product-name` | Product name heading |
| `product-price` | Product price |
| `product-image` | Product image |
| `product-description` | Product description |
| `product-category` | Category badge |
| `quantity-input` | Quantity number input |
| `add-to-cart-button` | Add to Cart button |
| `added-notification` | Success notification (visible 2s after add) |

### Cart
| Selector | Element |
|----------|---------|
| `cart-item-{id}` | Cart line item (e.g., `cart-item-cart-1`) |
| `cart-item-quantity-{id}` | Quantity display for item |
| `quantity-increase-{id}` | Increase quantity button |
| `quantity-decrease-{id}` | Decrease quantity button |
| `remove-item-{id}` | Remove item button |
| `cart-total` | Cart total price |
| `checkout-button` | Proceed to Checkout button |
| `empty-cart-message` | Empty cart message |

### Checkout
| Selector | Element |
|----------|---------|
| `checkout-form` | The checkout form |
| `shipping-first-name` | First name input |
| `shipping-last-name` | Last name input |
| `shipping-email` | Email input |
| `shipping-address` | Address input |
| `shipping-city` | City input |
| `shipping-state` | State input |
| `shipping-zip` | Zip code input |
| `payment-name` | Name on card input |
| `payment-card-number` | Card number input |
| `payment-expiry` | Expiry date input |
| `payment-cvv` | CVV input |
| `submit-order-button` | Place Order button |
| `field-error-{testId}` | Validation error for a field (e.g., `field-error-shipping-email`) |

### Order Confirmation
| Selector | Element |
|----------|---------|
| `order-confirmation` | Confirmation container |
| `order-id` | Order ID display |
| `continue-shopping-link` | Continue Shopping button |

### Navigation (Auth)
| Selector | Element |
|----------|---------|
| `nav-login-link` | "Log In" link in navbar (visible when signed out) |
| `nav-signup-link` | "Sign Up" button in navbar (visible when signed out) |
| `user-greeting` | "Hi, {name}" text in navbar (visible when signed in) |
| `logout-button` | "Log Out" button in navbar (visible when signed in) |
| `auth-loading` | Loading placeholder while auth state is restoring |

### Login (`/login`)
| Selector | Element |
|----------|---------|
| `login-heading` | Page heading |
| `login-form` | The login form |
| `login-email` | Email input |
| `login-password` | Password input |
| `login-submit-button` | Log In button |
| `login-error` | General error message (e.g., "Invalid email or password") |
| `field-error-login-email` | Email field validation error |
| `field-error-login-password` | Password field validation error |
| `signup-link` | Link to signup page on the login form |

### Signup (`/signup`)
| Selector | Element |
|----------|---------|
| `signup-heading` | Page heading |
| `signup-form` | The signup form |
| `signup-name` | Full Name input |
| `signup-email` | Email input |
| `signup-password` | Password input |
| `signup-confirm-password` | Confirm Password input |
| `signup-submit-button` | Sign Up button |
| `signup-error` | General error message |
| `field-error-signup-name` | Name field validation error |
| `field-error-signup-email` | Email field validation error |
| `field-error-signup-password` | Password field validation error |
| `field-error-signup-confirm-password` | Confirm password field validation error |
| `login-link` | Link to login page on the signup form |

## Mock Data

The app uses 14 deterministic products with stable IDs (`prod-001` through `prod-014`). Product `prod-008` (Wool Beanie) is marked as out-of-stock for testing disabled states.

## Seeded Login Credentials

The app ships with pre-seeded user accounts defined in [`src/data/users.json`](src/data/users.json). Use any of these for login tests:

| Email | Password | Name |
|-------|----------|------|
| `demo@shopdemo.com` | `Demo@123` | Demo User |
| `jane.smith@example.com` | `Jane@2024` | Jane Smith |
| `john.doe@example.com` | `John@2024` | John Doe |
| `admin@shopdemo.com` | `Admin@123` | Test Admin |

Users created via `/signup` (or `POST /api/auth/signup`) are added to an in-memory store on top of the seeded list and persist until the MSW worker is reloaded (e.g., full page refresh that reloads the service worker, or server restart).

## Notes

- **No real backend**: All data is served by MSW's service worker in the browser
- **Cart resets on page reload**: Cart state lives in MSW's in-memory handler, not persistent storage
- **Auth session persists across reloads**: The login token is stored in `localStorage` under `shopdemo_auth_token` and restored by calling `GET /api/auth/me`. Seeded users stay logged in across page reloads because their IDs live in `users.json` and the token encodes the user ID. Users registered at runtime via `/signup` are lost on full worker reload — their session becomes an unknown user and `GET /api/auth/me` returns 401.
- **Deterministic data**: Product IDs, names, and prices are fixed — safe for assertions in tests
- **Images**: Placeholder images from `placehold.co` (no external API dependency)

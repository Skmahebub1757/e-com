# The General Store — demo e-commerce site

Node.js + Express backend, MySQL database, plain HTML/CSS/JS frontend
(no build step, no frameworks). Product catalog, cart, checkout, and
now buyer/seller accounts:

- **Buyers** can register, sign in, and see their order history.
- **Sellers** can register a shop, sign in, and manage their own
  product listings from a dashboard (list, edit, delete).
- Checkout still works for guests too — signing in just links the
  order to your account so it shows up in "My Orders."

No payment provider is wired up — checkout just records the order.

## 1. Requirements

- Node.js 18+
- A running MySQL server (local or remote)

## 2. Set up the database

```bash
mysql -u root -p < schema.sql
```

This creates the `general_store` database and its tables
(`users`, `products`, `orders`, `order_items`), and seeds 12 sample
products (unassigned to any seller — they're the house catalog).
Open `schema.sql` and edit the `INSERT INTO products` block to swap in
your own catalog whenever you're ready.

## 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials and a JWT secret:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=general_store
PORT=3000
JWT_SECRET=change_this_to_a_long_random_string
```

## 4. Install and run

```bash
npm install
npm start
```

Visit **http://localhost:3000**.

Use `npm run dev` instead of `npm start` to auto-restart on file changes
(requires Node 18.11+).

## Project structure

```
ecommerce-store/
├── server.js                    Express app: static files, product/checkout routes
├── schema.sql                   Database schema + sample products
├── package.json
├── .env.example
├── config/
│   ├── db.js                    Shared MySQL connection pool
│   └── authMiddleware.js        requireAuth / requireRole / optionalAuth
├── routes/
│   ├── auth.js                  Register (buyer or seller), login, /me
│   ├── sellerProducts.js        Seller-only CRUD for their own listings
│   └── orders.js                Buyer order history (/api/orders/mine)
└── public/
    ├── index.html                Catalog, cart drawer, checkout modal
    ├── register.html             Create account — Buyer/Seller toggle
    ├── login.html                Sign in (both roles)
    ├── seller-dashboard.html     Seller: manage own listings
    ├── account.html              Buyer: order history
    ├── css/style.css             All styling
    └── js/
        ├── session.js            Shared token storage + apiRequest() helper
        ├── app.js                Catalog, cart, checkout (unchanged flow)
        ├── auth.js               register.html + login.html form logic
        ├── seller.js              seller-dashboard.html logic
        └── account.js             account.html logic
```

## API

| Method | Route                       | Auth            | Description |
|--------|------------------------------|-----------------|--------------|
| GET    | `/api/products`              | —               | List products, optional `?category=` filter |
| GET    | `/api/products/:id`          | —               | Get a single product |
| POST   | `/api/checkout`               | optional        | Body `{ name, email, address, items }` → creates an order, decrements stock. If signed in, the order is linked to your account. |
| POST   | `/api/auth/register`          | —               | Body `{ name, email, password, role, shopName? }` — `role` is `'buyer'` or `'seller'` (`shopName` required for sellers) |
| POST   | `/api/auth/login`              | —               | Body `{ email, password }` → `{ token, user }` |
| GET    | `/api/auth/me`                 | required        | Returns the decoded token payload |
| GET    | `/api/orders/mine`             | required        | Order history for the signed-in buyer |
| GET    | `/api/seller/products`         | required, seller| This seller's own listings |
| POST   | `/api/seller/products`         | required, seller| Create a listing |
| PUT    | `/api/seller/products/:id`     | required, seller| Edit a listing (only if you own it) |
| DELETE | `/api/seller/products/:id`     | required, seller| Delete a listing (only if you own it) |

Prices are always re-read from the database on checkout — the client
never gets to decide what something costs. Passwords are hashed with
bcrypt; sessions are stateless JWTs stored in `localStorage` and sent
as `Authorization: Bearer <token>`.

## Notes / next steps if you want to go further

- **Cart persistence** still uses `localStorage`, so it's per-browser,
  not synced across devices for a signed-in buyer yet.
- **Admin role** — there's no site-wide admin role; sellers can only
  touch their own listings. Add a third role or an `is_admin` flag if
  you want a store-wide moderator.
- **No payments** — checkout only records the order in MySQL. Wiring up
  Stripe/PayPal would replace the final step of `POST /api/checkout`.
- **Stock control** — checkout runs inside a MySQL transaction and
  rejects the order if stock ran out between page load and submit.


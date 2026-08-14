require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const pool = require('./config/db');
const { optionalAuth } = require('./config/authMiddleware');
const authRoutes = require('./routes/auth');
const sellerProductRoutes = require('./routes/sellerProducts');
const orderRoutes = require('./routes/orders');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ---------------------------------------------------------------
// Accounts (buyer + seller registration/login), seller listings,
// and buyer order history
// ---------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/seller/products', sellerProductRoutes);
app.use('/api/orders', orderRoutes);

// ---------------------------------------------------------------
// GET /api/products - list all products (optional ?category=)
// ---------------------------------------------------------------
app.get('/api/products', async (req, res) => {
  try {
    const { category } = req.query;
    let sql = `SELECT p.id, p.sku, p.name, p.description, p.price, p.image_url, p.category, p.stock,
                      u.shop_name AS seller_shop_name
               FROM products p LEFT JOIN users u ON p.seller_id = u.id`;
    const params = [];
    if (category) {
      sql += ' WHERE p.category = ?';
      params.push(category);
    }
    sql += ' ORDER BY p.id ASC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// ---------------------------------------------------------------
// GET /api/products/:id - single product
// ---------------------------------------------------------------
app.get('/api/products/:id', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, sku, name, description, price, image_url, category, stock FROM products WHERE id = ?',
      [req.params.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load product' });
  }
});

// ---------------------------------------------------------------
// POST /api/checkout
// body: { name, email, address, items: [{ id, quantity }] }
// ---------------------------------------------------------------
app.post('/api/checkout', optionalAuth, async (req, res) => {
  const { name, email, address, items } = req.body;

  if (!name || !email || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing name, email, address, or cart items' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Look up current prices & stock server-side (never trust client prices)
    const ids = items.map((i) => i.id);
    const [products] = await conn.query(
      `SELECT id, name, price, stock FROM products WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    let total = 0;
    const lineItems = [];
    for (const item of items) {
      const product = products.find((p) => p.id === item.id);
      if (!product) throw new Error(`Product ${item.id} not found`);
      if (item.quantity < 1) throw new Error('Invalid quantity');
      if (product.stock < item.quantity) {
        throw new Error(`Not enough stock for ${product.name}`);
      }
      total += product.price * item.quantity;
      lineItems.push({ id: product.id, quantity: item.quantity, price: product.price });
    }

    const [orderResult] = await conn.query(
      'INSERT INTO orders (user_id, customer_name, customer_email, customer_address, total_amount) VALUES (?, ?, ?, ?, ?)',
      [req.user ? req.user.id : null, name, email, address, total.toFixed(2)]
    );
    const orderId = orderResult.insertId;

    for (const li of lineItems) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, li.id, li.quantity, li.price]
      );
      await conn.query('UPDATE products SET stock = stock - ? WHERE id = ?', [li.quantity, li.id]);
    }

    await conn.commit();
    res.status(201).json({ orderId, total: total.toFixed(2) });
  } catch (err) {
    await conn.rollback();
    console.error(err);
    res.status(400).json({ error: err.message || 'Checkout failed' });
  } finally {
    conn.release();
  }
});

// Fallback to the SPA shell for any non-API route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`General Store running at http://localhost:${PORT}`);
});

const express = require('express');
const pool = require('../config/db');
const { requireAuth, requireRole } = require('../config/authMiddleware');

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

function makeSku(sellerId) {
  return `SEL-${sellerId}-${Date.now().toString(36).toUpperCase()}`;
}

// GET /api/seller/products — only this seller's own listings
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE seller_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your listings.' });
  }
});

// POST /api/seller/products
router.post('/', async (req, res) => {
  try {
    const { name, description, price, image_url, category, stock } = req.body;
    if (!name || !price || !category) {
      return res.status(400).json({ error: 'Name, price, and category are required.' });
    }
    const [result] = await pool.query(
      `INSERT INTO products (sku, name, description, price, image_url, category, stock, seller_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [makeSku(req.user.id), name, description || null, price, image_url || null,
       category, stock || 0, req.user.id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not create listing.' });
  }
});

// PUT /api/seller/products/:id — only if it belongs to this seller
router.put('/:id', async (req, res) => {
  try {
    const { name, description, price, image_url, category, stock } = req.body;
    const [result] = await pool.query(
      `UPDATE products SET name=?, description=?, price=?, image_url=?, category=?, stock=?
       WHERE id=? AND seller_id=?`,
      [name, description || null, price, image_url || null, category, stock || 0,
       req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update listing.' });
  }
});

// DELETE /api/seller/products/:id — only if it belongs to this seller
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM products WHERE id = ? AND seller_id = ?',
      [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Listing not found.' });
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not delete listing.' });
  }
});

module.exports = router;

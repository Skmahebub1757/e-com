const express = require('express');
const pool = require('../config/db');
const { requireAuth } = require('../config/authMiddleware');

const router = express.Router();

// GET /api/orders/mine — order history for the signed-in buyer
router.get('/mine', requireAuth, async (req, res) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    for (const order of orders) {
      const [items] = await pool.query(
        `SELECT oi.*, p.name AS product_name
         FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`,
        [order.id]
      );
      order.items = items;
    }
    res.json(orders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your orders.' });
  }
});

module.exports = router;

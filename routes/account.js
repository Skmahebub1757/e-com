const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { requireAuth } = require('../config/authMiddleware');
const { signToken } = require('../config/token');

const router = express.Router();
router.use(requireAuth);

// GET /api/account — full profile for the signed-in user
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, name, email, role, shop_name, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found.' });
    const row = rows[0];
    res.json({
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      shopName: row.shop_name,
      memberSince: row.created_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load your account.' });
  }
});

// PUT /api/account — update name / email / shop name (sellers only)
// body: { name, email, shopName? }
router.put('/', async (req, res) => {
  try {
    const { name, email, shopName } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required.' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM users WHERE email = ? AND id != ?',
      [email, req.user.id]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Another account already uses that email.' });
    }

    const [rows] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    const isSeller = rows[0]?.role === 'seller';
    if (isSeller && !shopName) {
      return res.status(400).json({ error: 'Shop name is required for seller accounts.' });
    }

    await pool.query(
      'UPDATE users SET name = ?, email = ?, shop_name = ? WHERE id = ?',
      [name, email, isSeller ? shopName : null, req.user.id]
    );

    // Name/email are embedded in the token, so re-issue one that matches.
    const updatedUser = { id: req.user.id, name, email, role: req.user.role };
    const token = signToken(updatedUser);
    res.json({ token, user: { ...updatedUser, shopName: isSeller ? shopName : null } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update your account.' });
  }
});

// PUT /api/account/password — change password
// body: { currentPassword, newPassword }
router.put('/password', async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are both required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const [rows] = await pool.query('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Account not found.' });

    const match = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change your password.' });
  }
});

module.exports = router;

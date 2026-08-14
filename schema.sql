-- Run this once against your MySQL server:
--   mysql -u root -p < schema.sql

CREATE DATABASE IF NOT EXISTS general_store
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE general_store;

-- ---------------------------------------------------------------
-- Users (buyers and sellers share one table, split by `role`)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(160)  NOT NULL,
  email         VARCHAR(190)  NOT NULL UNIQUE,
  password_hash VARCHAR(255)  NOT NULL,
  role          ENUM('buyer','seller') NOT NULL DEFAULT 'buyer',
  shop_name     VARCHAR(160)  DEFAULT NULL,   -- sellers only
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(20)    NOT NULL UNIQUE,
  name        VARCHAR(255)   NOT NULL,
  description TEXT,
  price       DECIMAL(10,2)  NOT NULL,
  image_url   VARCHAR(500),
  category    VARCHAR(100)   NOT NULL,
  stock       INT            NOT NULL DEFAULT 100,
  seller_id   INT            DEFAULT NULL,    -- who listed it (NULL = house catalog)
  created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Orders (one row per checkout)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  user_id          INT           DEFAULT NULL,  -- set when the buyer was signed in; NULL for guest checkout
  customer_name    VARCHAR(255)  NOT NULL,
  customer_email   VARCHAR(255)  NOT NULL,
  customer_address TEXT          NOT NULL,
  total_amount     DECIMAL(10,2) NOT NULL,
  status           VARCHAR(50)   NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------
-- Order line items
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  order_id    INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL,
  unit_price  DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id)   REFERENCES orders(id)   ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------
-- Sample catalog ("General Store" theme — swap for your own goods)
-- ---------------------------------------------------------------
INSERT INTO products (sku, name, description, price, image_url, category, stock) VALUES
('GS-1001', 'Enamel Camp Mug',        '14oz speckled enamel mug, chips-resistant rim, wire handle.',            14.00, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600', 'Kitchen',  60),
('GS-1002', 'Waxed Canvas Tote',      'Water-resistant 12oz waxed canvas, leather straps, brass rivets.',      42.00, 'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=600', 'Bags',     35),
('GS-1003', 'Cedar Fire Starters',    'Box of 12 hand-dipped cedar and beeswax fire starters.',                 9.50, 'https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?w=600', 'Outdoor',  90),
('GS-1004', 'Wool Field Blanket',     'Heavyweight 80% wool throw, whipstitched edge, 50x70in.',                68.00, 'https://images.unsplash.com/photo-1600369672771-4a6614a3c72a?w=600', 'Home',     20),
('GS-1005', 'Cast Iron Skillet 10in', 'Pre-seasoned cast iron, oven safe to 500F, made to last generations.',  32.00, 'https://images.unsplash.com/photo-1544233726-9f1d2b27be8b?w=600', 'Kitchen',  40),
('GS-1006', 'Pocket Notebook Set',    'Set of 3 stitch-bound notebooks, blank pages, kraft covers.',            11.00, 'https://images.unsplash.com/photo-1517971071642-34a2d3ecc9cd?w=600', 'Stationery', 75),
('GS-1007', 'Leather Work Gloves',    'Full-grain cowhide, reinforced palm, one size fits most.',               24.00, 'https://images.unsplash.com/photo-1585232351009-aa87416fca90?w=600', 'Outdoor',  50),
('GS-1008', 'Beeswax Candle Trio',    'Three hand-poured beeswax pillar candles, unscented, 20hr burn each.',  19.00, 'https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?w=600', 'Home',     55),
('GS-1009', 'Denim Work Apron',       'Heavyweight cotton denim apron with two front pockets, adjustable neck.', 29.00, 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600', 'Kitchen',  30),
('GS-1010', 'Copper Watering Can',    'Solid copper, 1.5L capacity, brass rose head, ages naturally.',          38.00, 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600', 'Home',     25),
('GS-1011', 'Wax Canvas Apron',       'Rugged waxed-cotton apron for the workshop, brass buckle straps.',       36.00, 'https://images.unsplash.com/photo-1607000975624-2ff5240b6ce9?w=600', 'Outdoor',  22),
('GS-1012', 'Ceramic Pour-Over Set',  'Hand-thrown stoneware dripper and matching mug, dishwasher safe.',       26.00, 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600', 'Kitchen',  45);

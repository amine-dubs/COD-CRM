-- ============================================================
-- COD CRM — Database Migration: Product & Inventory Tables
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ──────────────────────────────────────────────────────────
-- 4. Products (tenant-scoped)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `products` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`    INT UNSIGNED NOT NULL,
    `name`        VARCHAR(200) NOT NULL,
    `sku`         VARCHAR(50) DEFAULT NULL,
    `description` TEXT DEFAULT NULL,
    `price`       DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `cost_price`  DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `weight`      DECIMAL(8, 2) DEFAULT 0.00,
    `category`    VARCHAR(100) DEFAULT NULL,
    `image_url`   VARCHAR(500) DEFAULT NULL,
    `status`      ENUM('active', 'inactive', 'draft') DEFAULT 'active',
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_products_store` (`store_id`),
    INDEX `idx_products_store_sku` (`store_id`, `sku`),
    INDEX `idx_products_store_status` (`store_id`, `status`),
    INDEX `idx_products_store_category` (`store_id`, `category`),
    CONSTRAINT `fk_products_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────
-- 5. Inventory (tenant-scoped, one row per product per store)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`    INT UNSIGNED NOT NULL,
    `product_id`  INT UNSIGNED NOT NULL,
    `quantity`    INT NOT NULL DEFAULT 0,
    `low_stock_threshold` INT DEFAULT 10,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_inventory_store_product` (`store_id`, `product_id`),
    CONSTRAINT `fk_inventory_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inventory_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────
-- 6. Inventory Movements (audit trail)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `inventory_movements` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`    INT UNSIGNED NOT NULL,
    `product_id`  INT UNSIGNED NOT NULL,
    `type`        ENUM('add', 'subtract', 'set') NOT NULL,
    `quantity`    INT NOT NULL,
    `previous_qty` INT NOT NULL DEFAULT 0,
    `new_qty`     INT NOT NULL DEFAULT 0,
    `reason`      VARCHAR(500) DEFAULT NULL,
    `performed_by` INT UNSIGNED DEFAULT NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_inv_movements_store_product` (`store_id`, `product_id`),
    INDEX `idx_inv_movements_created` (`created_at`),
    CONSTRAINT `fk_inv_movements_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inv_movements_product` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_inv_movements_user` FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- COD CRM — Database Migration: Delivery & Returns Tables
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ──────────────────────────────────────────────────────────
-- 10. Deliveries (tenant-scoped)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `deliveries` (
    `id`               INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`         INT UNSIGNED NOT NULL,
    `order_id`         INT UNSIGNED NOT NULL,
    `delivery_partner` VARCHAR(100) NOT NULL,
    `tracking_number`  VARCHAR(100) DEFAULT NULL,
    `status`           ENUM('pending', 'picked_up', 'in_transit', 'delivered', 'returned', 'failed') DEFAULT 'pending',
    `shipping_cost`    DECIMAL(12, 2) DEFAULT 0.00,
    `notes`            TEXT DEFAULT NULL,
    `created_by`       INT UNSIGNED DEFAULT NULL,
    `picked_up_at`     DATETIME DEFAULT NULL,
    `delivered_at`     DATETIME DEFAULT NULL,
    `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_deliveries_store` (`store_id`),
    INDEX `idx_deliveries_store_status` (`store_id`, `status`),
    INDEX `idx_deliveries_order` (`order_id`),
    INDEX `idx_deliveries_partner` (`store_id`, `delivery_partner`),
    CONSTRAINT `fk_deliveries_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_deliveries_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_deliveries_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────
-- 11. Returns (tenant-scoped)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `returns` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`    INT UNSIGNED NOT NULL,
    `order_id`    INT UNSIGNED NOT NULL,
    `reason`      ENUM('customer_refused', 'wrong_address', 'not_reachable', 'damaged', 'wrong_product', 'duplicate', 'other') NOT NULL,
    `notes`       TEXT DEFAULT NULL,
    `status`      ENUM('pending', 'processing', 'completed', 'restocked') DEFAULT 'pending',
    `created_by`  INT UNSIGNED DEFAULT NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_returns_store` (`store_id`),
    INDEX `idx_returns_store_status` (`store_id`, `status`),
    INDEX `idx_returns_order` (`order_id`),
    INDEX `idx_returns_reason` (`store_id`, `reason`),
    CONSTRAINT `fk_returns_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_returns_order` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_returns_user` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- COD CRM — Database Migration: Core Tables
-- ============================================================
-- Run order: 001 → 002 → 003 → 004
-- All tenant-scoped tables include store_id with composite indexes
-- ============================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ──────────────────────────────────────────────────────────
-- 1. Stores (tenant table)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `stores` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name`        VARCHAR(100) NOT NULL,
    `slug`        VARCHAR(100) NOT NULL UNIQUE,
    `phone`       VARCHAR(20) DEFAULT NULL,
    `address`     VARCHAR(255) DEFAULT NULL,
    `logo_url`    VARCHAR(500) DEFAULT NULL,
    `currency`    VARCHAR(3) DEFAULT 'DZD',
    `timezone`    VARCHAR(50) DEFAULT 'Africa/Algiers',
    `status`      ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    INDEX `idx_stores_slug` (`slug`),
    INDEX `idx_stores_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────
-- 2. Wilayas (Algeria's 58 wilayas — shared reference table)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `wilayas` (
    `id`          INT UNSIGNED NOT NULL,
    `code`        VARCHAR(5) NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `ar_name`     VARCHAR(100) NOT NULL,
    `shipping_zone` ENUM('zone_1', 'zone_2', 'zone_3') DEFAULT 'zone_1',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_wilayas_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────
-- 3. Users (tenant-scoped)
-- ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS `users` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `store_id`    INT UNSIGNED NOT NULL,
    `name`        VARCHAR(100) NOT NULL,
    `email`       VARCHAR(255) NOT NULL,
    `phone`       VARCHAR(20) DEFAULT NULL,
    `password`    VARCHAR(255) NOT NULL,
    `role`        ENUM('owner', 'admin', 'order_confirmator', 'inventory_manager', 'accountant', 'delivery_manager') NOT NULL DEFAULT 'admin',
    `status`      ENUM('active', 'inactive') DEFAULT 'active',
    `last_login`  DATETIME DEFAULT NULL,
    `created_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_users_store_email` (`store_id`, `email`),
    INDEX `idx_users_store_role` (`store_id`, `role`),
    INDEX `idx_users_store_status` (`store_id`, `status`),
    CONSTRAINT `fk_users_store` FOREIGN KEY (`store_id`) REFERENCES `stores`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

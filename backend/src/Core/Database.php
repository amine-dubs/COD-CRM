<?php

declare(strict_types=1);

namespace App\Core;

/**
 * PDO Database Singleton.
 *
 * Thread-safe, lazy-connected, prepared-statement-first.
 * All tenant-scoped queries should include a `store_id` WHERE clause.
 */
class Database
{
    private static ?self $instance = null;
    private \PDO $pdo;

    private function __construct()
    {
        $config = require __DIR__ . '/../../config/database.php';

        $dsn = sprintf(
            '%s:host=%s;port=%d;dbname=%s;charset=%s',
            $config['driver'],
            $config['host'],
            $config['port'],
            $config['database'],
            $config['charset']
        );

        $this->pdo = new \PDO(
            $dsn,
            $config['username'],
            $config['password'],
            $config['options']
        );
    }

    public static function getInstance(): self
    {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    public function getConnection(): \PDO
    {
        return $this->pdo;
    }

    // ── Query Helpers ─────────────────────────────────────

    /**
     * Execute a query and return all rows.
     */
    public function query(string $sql, array $params = []): array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    /**
     * Execute a query and return a single row.
     */
    public function queryOne(string $sql, array $params = []): ?array
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /**
     * Execute an INSERT/UPDATE/DELETE and return affected row count.
     */
    public function execute(string $sql, array $params = []): int
    {
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);
        return $stmt->rowCount();
    }

    /**
     * Insert a row and return the last insert ID.
     */
    public function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));

        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        $this->execute($sql, array_values($data));

        return (int)$this->pdo->lastInsertId();
    }

    /**
     * Update rows in a table. Returns affected row count.
     */
    public function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $setParts = [];
        $values = [];
        foreach ($data as $column => $value) {
            $setParts[] = "{$column} = ?";
            $values[] = $value;
        }

        $sql = "UPDATE {$table} SET " . implode(', ', $setParts) . " WHERE {$where}";
        return $this->execute($sql, array_merge($values, $whereParams));
    }

    /**
     * Delete rows from a table. Returns affected row count.
     */
    public function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        return $this->execute($sql, $params);
    }

    /**
     * Count rows matching a condition.
     */
    public function count(string $table, string $where = '1=1', array $params = []): int
    {
        $row = $this->queryOne("SELECT COUNT(*) as cnt FROM {$table} WHERE {$where}", $params);
        return (int)($row['cnt'] ?? 0);
    }

    /**
     * Begin a transaction.
     */
    public function beginTransaction(): void
    {
        $this->pdo->beginTransaction();
    }

    /**
     * Commit the current transaction.
     */
    public function commit(): void
    {
        $this->pdo->commit();
    }

    /**
     * Rollback the current transaction.
     */
    public function rollback(): void
    {
        $this->pdo->rollBack();
    }

    // Prevent cloning
    private function __clone() {}

    // Prevent unserialization
    public function __wakeup()
    {
        throw new \RuntimeException('Cannot unserialize singleton');
    }
}

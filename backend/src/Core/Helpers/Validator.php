<?php

declare(strict_types=1);

namespace App\Core\Helpers;

/**
 * Input Validator.
 *
 * Declarative, reusable validation with human-readable error messages.
 *
 * Usage:
 *   $v = new Validator($request->body());
 *   $v->required('email')->email('email')->required('password')->minLength('password', 8);
 *   if ($v->fails()) return Response::validationError($v->errors());
 */
class Validator
{
    private array $data;
    private array $errors = [];

    public function __construct(array $data)
    {
        $this->data = $data;
    }

    // ── Rule Methods (fluent) ─────────────────────────────

    public function required(string $field, string $message = null): self
    {
        if (!array_key_exists($field, $this->data)) {
            $this->errors[$field][] = $message ?? "The {$field} field is required.";
            return $this;
        }

        $value = $this->data[$field];
        $isEmpty = false;

        if ($value === null) {
            $isEmpty = true;
        } elseif (is_string($value)) {
            $isEmpty = trim($value) === '';
        } elseif (is_array($value)) {
            $isEmpty = empty($value);
        }

        if ($isEmpty) {
            $this->errors[$field][] = $message ?? "The {$field} field is required.";
        }
        return $this;
    }

    public function email(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !filter_var($this->data[$field], FILTER_VALIDATE_EMAIL)) {
            $this->errors[$field][] = $message ?? "The {$field} must be a valid email address.";
        }
        return $this;
    }

    public function minLength(string $field, int $min, string $message = null): self
    {
        if (isset($this->data[$field]) && mb_strlen((string)$this->data[$field]) < $min) {
            $this->errors[$field][] = $message ?? "The {$field} must be at least {$min} characters.";
        }
        return $this;
    }

    public function maxLength(string $field, int $max, string $message = null): self
    {
        if (isset($this->data[$field]) && mb_strlen((string)$this->data[$field]) > $max) {
            $this->errors[$field][] = $message ?? "The {$field} must not exceed {$max} characters.";
        }
        return $this;
    }

    public function numeric(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !is_numeric($this->data[$field])) {
            $this->errors[$field][] = $message ?? "The {$field} must be a number.";
        }
        return $this;
    }

    public function integer(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && filter_var($this->data[$field], FILTER_VALIDATE_INT) === false) {
            $this->errors[$field][] = $message ?? "The {$field} must be an integer.";
        }
        return $this;
    }

    public function min(string $field, float $min, string $message = null): self
    {
        if (isset($this->data[$field]) && is_numeric($this->data[$field]) && (float)$this->data[$field] < $min) {
            $this->errors[$field][] = $message ?? "The {$field} must be at least {$min}.";
        }
        return $this;
    }

    public function max(string $field, float $max, string $message = null): self
    {
        if (isset($this->data[$field]) && is_numeric($this->data[$field]) && (float)$this->data[$field] > $max) {
            $this->errors[$field][] = $message ?? "The {$field} must not be greater than {$max}.";
        }
        return $this;
    }

    public function in(string $field, array $allowed, string $message = null): self
    {
        if (isset($this->data[$field]) && !in_array($this->data[$field], $allowed, true)) {
            $list = implode(', ', $allowed);
            $this->errors[$field][] = $message ?? "The {$field} must be one of: {$list}.";
        }
        return $this;
    }

    public function confirmed(string $field, string $confirmationField = null, string $message = null): self
    {
        $confirmationField ??= $field . '_confirmation';
        if (isset($this->data[$field]) && ($this->data[$field] !== ($this->data[$confirmationField] ?? null))) {
            $this->errors[$field][] = $message ?? "The {$field} confirmation does not match.";
        }
        return $this;
    }

    public function phone(string $field, string $message = null): self
    {
        if (isset($this->data[$field])) {
            // Algerian phone format: 05/06/07 followed by 8 digits
            $cleaned = preg_replace('/[\s\-\(\)]/', '', (string)$this->data[$field]);
            if (!preg_match('/^(\+213|0)(5|6|7)\d{8}$/', $cleaned)) {
                $this->errors[$field][] = $message ?? "The {$field} must be a valid Algerian phone number.";
            }
        }
        return $this;
    }

    public function date(string $field, string $format = 'Y-m-d', string $message = null): self
    {
        if (isset($this->data[$field])) {
            $d = \DateTime::createFromFormat($format, (string)$this->data[$field]);
            if (!$d || $d->format($format) !== $this->data[$field]) {
                $this->errors[$field][] = $message ?? "The {$field} must be a valid date in {$format} format.";
            }
        }
        return $this;
    }

    public function array(string $field, string $message = null): self
    {
        if (isset($this->data[$field]) && !is_array($this->data[$field])) {
            $this->errors[$field][] = $message ?? "The {$field} must be an array.";
        }
        return $this;
    }

    // ── Result ────────────────────────────────────────────

    public function fails(): bool
    {
        return !empty($this->errors);
    }

    public function passes(): bool
    {
        return empty($this->errors);
    }

    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * Return only the validated (present & rule-checked) fields.
     */
    public function validated(array $fields): array
    {
        return array_intersect_key($this->data, array_flip($fields));
    }
}

<?php

declare(strict_types=1);

namespace App\Core\Middleware;

use App\Core\Request;
use App\Core\Response;

/**
 * Role-Based Access Control Middleware.
 *
 * Checks that the authenticated user has one of the allowed roles
 * for the current route. Must run AFTER AuthMiddleware.
 *
 * Usage (in route definitions):
 *   new RBACMiddleware(['owner', 'admin'])
 *   new RBACMiddleware(['owner', 'admin', 'order_confirmator'])
 *
 * Roles:
 *   - owner              → Full access to everything
 *   - admin              → Almost full access (cannot delete store)
 *   - order_confirmator  → Orders read/update only
 *   - inventory_manager  → Products & inventory management
 *   - accountant         → Financial reports & analytics (read-only)
 *   - delivery_manager   → Deliveries & returns management
 */
class RBACMiddleware
{
    private array $allowedRoles;

    public function __construct(array $allowedRoles = [])
    {
        $this->allowedRoles = $allowedRoles;
    }

    public function handle(Request $request): ?Response
    {
        $userRole = $request->authUserRole();

        if (!$userRole) {
            return Response::unauthorized('Authentication required');
        }

        // Owner always has access
        if ($userRole === 'owner') {
            return null;
        }

        // Check if user's role is in the allowed list
        if (!empty($this->allowedRoles) && !in_array($userRole, $this->allowedRoles, true)) {
            return Response::forbidden(
                'You do not have permission to access this resource. Required role: ' .
                implode(' or ', $this->allowedRoles)
            );
        }

        return null; // Allowed → continue
    }
}

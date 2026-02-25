# COD CRM — Multi-Tenant eCommerce CRM SaaS

A production-ready Multi-Tenant eCommerce CRM SaaS platform targeting Algerian eCommerce businesses (COD model).

## Tech Stack

| Layer      | Technology                                      |
|------------|--------------------------------------------------|
| Frontend   | Next.js 14+ (App Router), TypeScript, TailwindCSS |
| Backend    | PHP 8.2+ (REST API, Clean Architecture)           |
| Database   | MySQL 8.0+                                        |
| Auth       | JWT (Access + Refresh tokens)                     |
| Architecture | Multi-tenant (single DB, `store_id` isolation)  |

## Features

- **Multi-store system** — each store has fully isolated data
- **RBAC** — Owner, Admin, Order Confirmator, Inventory Manager, Accountant, Delivery Manager
- **COD workflow** — order lifecycle optimized for Cash-on-Delivery
- **Wilaya-based analytics** — Algeria's 58 wilayas with delivery insights
- **Return rate tracking** — per-product, per-wilaya, per-delivery-partner
- **Smart risk scoring** — future ML module ready
- **i18n** — Arabic, French, English with RTL support
- **Theming** — Dark / Light mode
- **Subdomain-ready** — `store1.codcrm.com`

## Project Structure

```
COD CRM/
├── backend/           # PHP REST API
│   ├── public/        # Entry point (index.php)
│   ├── config/        # App, DB, JWT, CORS configs
│   ├── routes/        # API route definitions
│   ├── src/
│   │   ├── Core/      # Router, Request, Response, Database, Middleware
│   │   ├── Modules/   # Domain modules (Auth, Order, Product, etc.)
│   │   └── Models/    # Entity / DTO classes
│   ├── database/
│   │   ├── migrations/
│   │   └── seeders/
│   └── storage/logs/
│
├── frontend/          # Next.js App
│   └── src/
│       ├── app/       # App Router pages & layouts
│       ├── components/# UI, layout, domain components
│       ├── hooks/     # Custom React hooks
│       ├── lib/       # API client, auth, constants, utils
│       ├── providers/ # Context providers
│       ├── stores/    # Zustand state stores
│       ├── types/     # TypeScript interfaces
│       └── styles/    # Global styles
│
└── README.md
```

## Getting Started

### Prerequisites

- PHP 8.2+ with extensions: `pdo_mysql`, `mbstring`, `openssl`
- Composer 2+
- Node.js 18+ and npm/pnpm
- MySQL 8.0+

### Backend Setup

```bash
cd backend
cp .env.example .env         # Edit with your DB credentials
composer install
# Import migrations:
mysql -u root -p your_db < database/migrations/001_create_stores.sql
# ... (run all migration files in order)
# Start PHP dev server:
php -S localhost:8000 -t public
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # Set NEXT_PUBLIC_API_URL
npm run dev                  # → http://localhost:3000
```

## API Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
X-Store-Id: <store_id>
```

## License

Proprietary — All rights reserved.

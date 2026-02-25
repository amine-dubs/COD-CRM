# ============================================================
# COD CRM — Hostinger Deployment Structure
# ============================================================
#
# هيكل الملفات على الاستضافة:
#
# الطريقة 1 (الموصى بها): كل شيء في مجلد api
# ──────────────────────────────────────────────
# public_html/
# └── api/
#     ├── .htaccess              ← يوجه كل الطلبات لـ index.php
#     ├── index.php              ← من backend/public/index.php
#     ├── config/                ← من backend/config/
#     ├── database/              ← من backend/database/
#     ├── routes/                ← من backend/routes/
#     ├── src/                   ← من backend/src/
#     ├── storage/               ← من backend/storage/ (اجعله writable)
#     ├── vendor/                ← من backend/vendor/ (بعد composer install)
#     ├── composer.json
#     ├── composer.lock
#     └── .env                   ← أنشئه يدوياً على السيرفر
#
# ══════════════════════════════════════════════════════════════

# Technical Requirements Document (TRD)
## Bhavesh Solanki RTO & Insurance Advisor — CRM System

**Version:** 1.0
**Related PRD:** PRD_Bhavesh_RTO_CRM.md

---

## 1. Tech Stack (Recommended)

| Layer | Technology |
|---|---|
| Backend | Node.js + Express (or Django/DRF) |
| Database | MySQL |
| Auth | Email + Password, OTP via email (e.g., Nodemailer + a TOTP/one-time-code library), JWT session after verification |
| Frontend | React (Vite) + Tailwind CSS + a charting library (Recharts/Chart.js) |
| WhatsApp | WhatsApp Cloud API (Meta) or Twilio WhatsApp API |
| Receipt/PDF | `pdfkit` / `react-pdf` / `puppeteer` (HTML→PDF) |
| Scheduler | node-cron (or Celery beat if Django) — for expiry-reminder checks |

## 2. Architecture

```
[React SPA] <--REST/JSON--> [Express/Django API] <--> [MySQL]
                                    |
                         [Email OTP Service] (Nodemailer/SendGrid)
                                    |
                         [WhatsApp API] (Meta Cloud API / Twilio)
                                    |
                         [Cron: expiry reminder scanner]
```

## 3. Data Model

### 3.1 Admin
- id, name, email (unique), password_hash, is_verified, created_at
- **Constraint:** only one row is ever allowed in this table (enforce at application layer — reject any signup attempt if `count(Admin) >= 1`).

### 3.2 OTP
- id, admin_id (FK), code, expires_at, purpose (`login`), consumed (bool)

### 3.3 Customer
- id
- name
- contact_number (with country code, used for WhatsApp)
- category (enum: `insurance`, `permit`, `fitness_puc`, `license`)
- vehicle_number (optional, shared across categories)
- start_date
- end_date / expiry_date
- amount_total (decimal)
- amount_paid (decimal)
- amount_pending (computed: `amount_total - amount_paid`)
- notes (optional)
- created_at, updated_at

> Note: A single `Customer` table with a `category` discriminator keeps the "one form, filtered pages" behavior simple — category pages just query `WHERE category = 'fitness_puc'` and select only the fields relevant to that category in the response/serializer.

### 3.4 Payment
- id, customer_id (FK), amount, payment_date, method (optional), receipt_number

### 3.5 MessageLog (for WhatsApp sends)
- id, customer_id (FK), category, message_body, sent_at, status (`sent`/`failed`), provider_response

## 4. API Specification

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/signup/` | Allowed only if no admin exists yet; creates the single admin |
| POST | `/api/auth/login/` | Validates email/password, triggers OTP email |
| POST | `/api/auth/verify-otp/` | Verifies OTP, issues JWT session token |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/dashboard/summary/` | Returns `total_customers`, `total_collection`, `pending_collection` |
| GET | `/api/dashboard/monthly-collection/` | Returns array of `{month, total}` for the graph |

### Customers (Master Form)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/customers/` | Create a new customer record (any category) |
| GET | `/api/customers/{id}/` | Full record detail (used for edit form) |
| PUT/PATCH | `/api/customers/{id}/` | Edit |
| DELETE | `/api/customers/{id}/` | Delete |

### Category Pages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/customers/?category=insurance` | Returns only insurance-relevant fields |
| GET | `/api/customers/?category=permit` | Returns only permit-relevant fields |
| GET | `/api/customers/?category=fitness_puc` | Returns name, contact, start_date, end_date only |
| GET | `/api/customers/?category=license` | Returns only license-relevant fields |

> Implementation detail: use category-specific serializers/response shapers so each endpoint only exposes the fields relevant to that page, even though the underlying table is shared.

### Payments / Receipt
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/payments/` | Record a payment against a customer |
| GET | `/api/receipts/{customer_id}/` | Returns receipt data (total, collected, pending) |
| GET | `/api/receipts/{customer_id}/pdf/` | Generates downloadable PDF receipt |

### WhatsApp Reminders
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/customers/{id}/send-reminder/` | Sends a category-specific WhatsApp message to the customer's contact number |
| GET | `/api/customers/expiring-soon/?category=insurance` | Returns records with `end_date` within the next 30 days (for highlighting/flagging in the UI) |

## 5. Business Logic Notes

- **Single-admin enforcement:** signup endpoint checks `Admin.count() == 0` before allowing creation; return 403 otherwise.
- **OTP verification:** OTP expires after a short window (e.g., 5–10 minutes); JWT is only issued after successful OTP match.
- **Pending amount:** always computed as `amount_total - SUM(payments.amount)`, never stored as a manually-editable field, to avoid drift.
- **Expiry detection:** a scheduled job (daily) scans all customers where `end_date` is within the next 30 days and marks them (e.g., `needs_reminder = true`) so the frontend can highlight them on category pages.
- **WhatsApp message templates:** one template per category, e.g.:
  - Insurance: "Your vehicle insurance is expiring on {end_date}. Please renew soon."
  - Permit: "Your permit is expiring on {end_date}..."
  - Fitness/PUC: "Your fitness/PUC certificate is expiring on {end_date}..."
  - License: "Your license is expiring on {end_date}..."

## 6. Frontend Pages

1. **Login / OTP Verification**
2. **Sign-Up** (only rendered/reachable if no admin exists — hidden otherwise)
3. **Dashboard** — greeting + 3 summary cards + monthly collection chart
4. **Customer Form** — add/edit (single form, category selector shows/hides relevant fields), with a list showing all customers + edit/delete actions
5. **Category Pages** (×4: Insurance, Permit, Fitness/PUC, License) — filtered table showing only that category's relevant columns, with a **Send** button per row and visual highlight for records expiring within 30 days
6. **Receipt Page** — total / collected / pending summary, printable/downloadable PDF

## 7. Non-Functional / Backend Expectations
- JWT-protected routes (all routes require an authenticated admin session except login/signup/OTP).
- Input validation on all forms (required fields, valid phone number format for WhatsApp, positive amounts).
- Pagination and search/filter on customer list and category pages if the dataset grows large.
- Logging of WhatsApp send attempts (success/failure) in `MessageLog` for auditability.

## 8. Deployment
- `.env` for: MySQL credentials (`DB_HOST`, `DB_PORT` (3306), `DB_NAME`, `DB_USER`, `DB_PASSWORD`), JWT secret, email service (SMTP/SendGrid) credentials, WhatsApp API credentials (Meta Cloud API token / Twilio SID+auth token).
- Optional Docker + docker-compose for API + MySQL + frontend (use the official `mysql:8` image).
- Use an ORM/query builder with good MySQL support — e.g., Sequelize, Prisma, or Knex — for models/migrations.

## 9. Testing Recommendations
- Unit test: single-admin enforcement, OTP expiry, pending-amount computation, category-based field filtering, expiry-window detection (30-day flag).

# Product Requirements Document (PRD)
## Bhavesh Solanki RTO & Insurance Advisor — CRM System

**Client:** Bhavesh Solanki RTO & Insurance Advisor
**Version:** 1.0
**Source:** Client brief (Bhavesh_Solanki_RTO.docx)

---

## 1. Overview

A single-admin CRM for an RTO (Regional Transport Office) & Insurance advisory business. The admin tracks customers across four service categories — **Insurance, Permit, Fitness/PUC, License** — records payments, views collection dashboards, generates payment receipts, and sends WhatsApp reminders (e.g., for upcoming expiries).

## 2. User Roles

- **Single Admin only.** The system allows exactly one admin account.
  - First-time use: the very first user may sign up (becomes the admin).
  - Once an admin account exists, the sign-up option is disabled/hidden — no second account can ever be created.
- No customer-facing login; customers are just records managed by the admin.

## 3. Authentication Flow

1. Admin enters email + password.
2. System sends an OTP / verification code to the admin's registered email.
3. Admin enters the OTP to verify (Yes/No confirmation step).
4. On successful verification, admin is redirected to the Dashboard.
5. If no admin account exists yet, the login screen instead offers a one-time Sign-Up form (disabled forever after first use).

## 4. Functional Requirements

### 4.1 Dashboard (Landing Page)
- Personalized greeting for the admin (e.g., "Welcome back, Bhavesh").
- Three summary cards:
  1. **Total Customers**
  2. **Total Collection** (sum of all payments received)
  3. **Pending Collection** (sum of all outstanding/due amounts)
- A **monthly collection graph** (bar/line chart) showing collection totals per month.

### 4.2 Customer Form (Add / Edit / Delete)
- A single master form used to add a new customer record or edit/delete an existing one.
- The form captures the customer's details and which service category the record belongs to (Insurance / Permit / Fitness-PUC / License), along with category-specific dates and amounts (see form reference image in the source doc for exact field layout).
- Supports full CRUD: Create, Edit, Delete.

### 4.3 Category Pages
Four separate pages/tabs, one per service type:
- **Insurance**
- **Permit**
- **Fitness / PUC**
- **License**

Each category page shows **only the customers and only the fields relevant to that category** — not the full record. Example given in the brief: the Fitness page shows only **Customer Name, Contact Number, Fitness Start Date, Fitness End Date** (no other fields from the master form are shown here).

The same filtering principle applies to Insurance, Permit, and License pages (each shows its own relevant subset of fields).

### 4.4 Payment Receipt
- A dedicated "Bhavesh RTO Payment Receipt" view/document showing:
  - Total payment (overall)
  - All collected payments (itemized/summed)
  - All pending payments (itemized/summed)
- Should be viewable on-screen and, ideally, downloadable/printable as a receipt.

### 4.5 WhatsApp Reminder ("Send") Button
- Every category page (Insurance, Permit, Fitness/PUC, License) has a **Send** button per customer record.
- Clicking Send triggers a WhatsApp message to that customer's contact number.
- Message content is **generated according to the category** (e.g., an insurance-expiry reminder for the Insurance page, a permit-renewal reminder for the Permit page, etc.).
- **Trigger condition:** reminders are especially relevant when a record's expiry date falls within the **next 1 month** — the system should be able to identify/flag such records (e.g., visually highlight them) so the admin knows who to remind.

## 5. Non-Functional Requirements
- Clean, simple, mobile-friendly UI (single admin user, so simplicity over scale).
- Secure OTP-based login (no unauthorized second admin ever created).
- Fast dashboard load (aggregation should be efficient even as records grow).
- WhatsApp integration must handle failures gracefully (e.g., invalid number) and show a success/failure toast.

## 6. Out of Scope (Assumptions)
- No customer self-service portal — admin-only system.
- No multi-admin / role hierarchy — deliberately restricted to one admin.
- Payment collection itself (e.g., online payment gateway) is not requested — only recording and reporting of payments.

## 7. Success Criteria
- Only one admin account can ever exist.
- Dashboard cards and monthly graph always reflect accurate, up-to-date totals.
- Each category page shows strictly its own relevant fields — no data leakage across categories.
- Admin can send a correctly-worded WhatsApp reminder from any category page with one click.
- Receipt accurately reflects collected vs. pending amounts at all times.

# Bhavesh Solanki RTO & Insurance Advisor CRM

A full-stack, single-admin CRM system designed for managing RTO (Regional Transport Office) & Insurance advisory operations across four service categories: **Insurance, Permit, Fitness/PUC, and License**.

---

## 🌟 Features

- **Single-Admin Enforcement**: Exactly one admin account can ever exist. Signup is automatically disabled once the first admin registers.
- **Two-Factor OTP Login**: Secure authentication flow via Email + Password followed by a 6-digit OTP verification.
- **Dashboard Analytics**:
  - Greeting card tailored to time of day
  - Real-time summary cards: Total Customers, Total Collection, Pending Collection
  - Recharts monthly collection bar chart (interactive breakdown over the past 12 months)
- **Master Customer Form**: Single form with dynamic category-driven field visibility for full CRUD operations.
- **Category-Filtered Views**: Dedicated pages for Insurance, Permit, Fitness/PUC, and License displaying only category-relevant fields.
- **Expiry Detection & Highlights**: Visual highlighting (expiring soon badges) for customer records expiring within the next 30 days.
- **WhatsApp Integration**: Per-row "Send" reminder button with category-tailored message templates and audit logging in `MessageLog`. Supports Stub, Meta Cloud API, and Twilio WhatsApp providers.
- **Payment & Receipt Generator**:
  - Tracks total, collected, and pending amounts per customer and overall.
  - Downloads clean, printable A4 PDF receipts powered by Puppeteer.
- **Automated Expiry Cron Job**: Daily cron schedule (7:00 AM IST) scanning for upcoming expiries and marking customer records.

---

## 🛠️ Tech Stack

### Backend
- **Django 5** + **Django REST Framework**
- **MySQL** via Django's ORM (`mysqlclient`)
- **JWT** authentication (`PyJWT`) & **Bcrypt** password hashing
- OTP codes are logged to the console in dev (wire up Django's email backend for production)
- **WhatsApp reminders** — stubbed provider, logged to `MessageLog`
- **ReportLab** for PDF receipt generation
- **django-cors-headers** for React frontend CORS support

### Frontend
- **React** (Vite) + **Tailwind CSS v4**
- **Recharts** for monthly collection data visualization
- **React Router v6** for protected client-side routing
- **React Hook Form** for form validation
- **React Hot Toast** for user action notifications

---

## 🚀 Getting Started

### Prerequisites
- **Python** (v3.11 or higher)
- **MySQL** database server running locally or remotely

---

### Step 1: Database Setup
Create a MySQL database for the application:
```sql
CREATE DATABASE bhavesh_rto;
```

---

### Step 2: Backend Setup

1. Navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate      # Windows
   source venv/bin/activate   # macOS/Linux
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```

5. Configure `.env` variables:
   ```env
   SECRET_KEY=your-django-secret-key
   DEBUG=True
   ALLOWED_HOSTS=*

   DB_ENGINE=django.db.backends.mysql
   DB_NAME=bhavesh_rto
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_HOST=localhost
   DB_PORT=3306

   JWT_SECRET=your_super_secret_jwt_key
   JWT_EXPIRES_IN=8h
   OTP_EXPIRES_MINUTES=10

   FRONTEND_URL=http://localhost:5173
   ```

6. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

7. Start the backend server (the frontend expects it on port 5000):
   ```bash
   python manage.py runserver 0.0.0.0:5000
   ```

---

### Step 3: Frontend Setup

1. Navigate to the `frontend` directory in a new terminal window:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the Vite dev server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit: `http://localhost:5173`

---

## 🔒 Initial Admin Signup & Login Flow

1. On first launch, navigating to `http://localhost:5173` will direct you to `/signup` (since zero admins exist).
2. Fill out the signup form with your Admin Name, Email, and Password.
3. Once registered, `/signup` is **permanently disabled**. Any subsequent access attempts to signup will return HTTP 403 / redirect to `/login`.
4. On `/login`, enter your registered email and password.
5. An OTP code is generated on login — in development it is printed to the Django server console (`🔑 DEV OTP for ...`). Wire up a real email backend in `crm_app/views.py`/Django settings for production use.
6. Enter the 6-digit OTP code to complete login and access your Dashboard.

---

## 📄 License
Privately built for **Bhavesh Solanki RTO & Insurance Advisor**.

# Finance360 (FINsightEdge) - Enterprise Financial Intelligence Suite

Finance360 is an executive-grade financial analytics dashboard and financial intelligence suite. It delivers multi-period P&L normalization, Actuals-vs-Budget variance analysis, multi-dimensional drill-downs across 8 Business Units and 4 Business Groups, and an AI-driven Financial Intelligence Analyst.

The application has been **fully migrated from Google BigQuery and MongoDB to 100% MySQL**, eliminating all external cloud database and paid LLM dependencies for a complete zero-cost operational profile.

---

## 1. System Architecture Overview

```
                      ┌──────────────────────────────────────────┐
                      │    Modern React + Vite Frontend (SPA)    │
                      │  - Executive 360° | Performance          │
                      │  - KPI Scorecards | P&L Summaries / DIS  │
                      │  - P&L Trends     | Financial Assistant  │
                      └────────────────────┬─────────────────────┘
                                           │ HTTP / REST (/fin/api/*)
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │        Node.js Express Backend           │
                      │  - P&L Normalization & Variance Engine   │
                      │  - Hierarchical Scoping & Auth (JWT/RBAC)│
                      │  - MySQL Financial Intelligence Agent    │
                      └────────────────────┬─────────────────────┘
                                           │ Parameterized SQL (mysql2 pool)
                                           ▼
                      ┌──────────────────────────────────────────┐
                      │          MySQL Database 8.0              │
                      │       Database: finance_data             │
                      │  - dataai (8,064 rows)                   │
                      │  - order_intake (1,728 rows)             │
                      │  - capex (576 rows)                      │
                      │  - collection (576 rows)                 │
                      │  - users (RBAC & User Profiles)          │
                      └──────────────────────────────────────────┘
```

---

## 2. MySQL Schema & Data Contract

All financial data covers **FY 2023-24 (FY24)**, **FY 2024-25 (FY25)**, and **FY 2025-26 (FY26)**.

### Tables & Records
| Table Name | Record Count | Description | Key Columns |
|------------|--------------|-------------|-------------|
| `dataai` | ~8,064 | Authoritative P&L financial line items | `FYs`, `QuarterFY`, `Posting Date`, `Biz1`, `Segment`, `SG&A`, `Nature`, `Mn` |
| `order_intake` | ~1,728 | Sales bookings and contract commitments | `Year`, `Month`, `Biz1`, `Segment`, `Nature`, `Amount` |
| `capex` | ~576 | Capital expenditure investments | `Year`, `Month`, `Biz1`, `Segment`, `Nature`, `Amount` |
| `collection` | ~576 | Cash collections received from clients | `Year`, `Month`, `Biz1`, `Segment`, `Nature`, `Amount` |
| `users` | Dynamic | System user authentication, roles, and unit permissions | `_id`, `user_id`, `email`, `name`, `role`, `business_groups`, `businesses` |

---

## 3. Financial Metrics & Formulas Reference

All financial calculations follow the authoritative enterprise accounting standards:

- **Net Revenue**: $\sum \text{Revenue}$
- **Variable Cost**: $\sum \text{Variable Cost}$
- **Gross Profit**: $\text{Revenue} - \text{Variable Cost}$
- **Gross Margin %**: $\left(\frac{\text{Gross Profit}}{\text{Revenue}}\right) \times 100$
- **Variable Cost %**: $\left(\frac{\text{Variable Cost}}{\text{Revenue}}\right) \times 100$
- **Throughput**: $\text{Revenue} - \text{Variable Cost}$
- **Fixed Costs**: $\text{Premises} + \text{Travel} + \text{Telecom} + \text{Legal \& Professional} + \text{Administration}$
- **Total Operating Expenses (Opex)**: $\text{People Cost} + \text{Marketing Expenses} + \text{Fixed Costs} + \text{PICA} + \text{Corporate Allocation}$
- **EBITDA Contribution**: $\text{Gross Profit} - \text{Marketing Expenses}$
- **EBITDA (Operating Profit)**: $\text{Gross Profit} - \text{Total Opex}$
- **EBITDA %**: $\left(\frac{\text{EBITDA}}{\text{Revenue}}\right) \times 100$
- **Operating Leverage Index**: $\left(\frac{\text{EBITDA \%}}{\text{Gross Margin \%}}\right) \times 100$
- **Net Cash**: $\text{Collections} - \text{Total Opex} - \text{Capex}$
- **Budget Achievement %**: $\left(\frac{\text{Actual}}{\text{Budget}}\right) \times 100$

---

## 4. Environment Variables Configuration

Copy `backend/.env.example` to `backend/.env`:

```bash
cp backend/.env.example backend/.env
```

### Required Variables (`backend/.env`):
```ini
# MySQL Database Configuration
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=finance_data
MYSQL_USER=root
MYSQL_PASSWORD=your_mysql_password

# Application Settings
APP_NAME=Finance360
PORT=4820
NODE_ENV=development
```

> **Note:** MongoDB (`MONGO_URI`), BigQuery, and Google Cloud credentials are **no longer required**.

---

## 5. Local Setup Instructions

### Prerequisites
- Node.js >= 18
- MySQL Server 8.0+ running on port 3306 with database `finance_data`

### 1. Database Initialization & Seeding
If setting up a fresh MySQL instance, run the automated database dump import:
```powershell
# In PowerShell:
& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p finance_data < backend\finance_data_dump.sql
```
Or run the built-in initializer script:
```bash
cd backend
node init_db.js
```

### 2. Install Dependencies
```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### 3. Start Development Servers
**Backend:**
```bash
cd backend
npm run dev
# Server starts on http://127.0.0.1:4820
```

**Frontend:**
```bash
cd frontend
npm run dev
# UI accessible at http://localhost:5173
```

---

## 6. Automated Testing & Validation

A comprehensive 27-point automated test suite verifies all database connections, schema constraints, formula calculations, SQL injection protections, and AI assistant routines:

```bash
cd backend
npm test
```

### Test Output:
```
======================================================
   FINANCE360: MYSQL MIGRATION VERIFICATION SUITE
======================================================

Test Group 1: MySQL Database Connectivity
  ✅ PASS: MySQL pool connection healthy and responsive

Test Group 2: Table Existence & Data Integrity
  ✅ PASS: dataai table populated (found 8064 rows)
  ✅ PASS: order_intake table populated (found 1728 rows)
  ✅ PASS: capex table populated (found 576 rows)
  ✅ PASS: collection table populated (found 576 rows)
  ✅ PASS: users table exists and populated in MySQL (found 1 rows)

Test Group 3: Parameterized SQL & Injection Prevention
  ✅ PASS: Parameterized query blocks SQL injection attempt

Test Group 4: Fiscal Year & Actual vs Budget Scenarios
  ✅ PASS: All 3 Fiscal Years present (FY24, FY25, FY26)
  ✅ PASS: Distinct Actuals and Budget scenarios present

Test Group 5: Finance Metric Formulas & Computations
  ✅ PASS: Revenue is positive (₹613.6821 Mn)
  ✅ PASS: Gross Profit = Revenue - Variable Cost (₹550.9102 Mn)
  ✅ PASS: Gross Margin % = (Gross Profit / Revenue) * 100 (89.77%)
  ✅ PASS: Fixed Costs = Premises + Travel + Telecom + Legal + Admin (₹47.0523 Mn)
  ✅ PASS: Total Opex = People + Marketing + Fixed Costs + PICA + Corp Alloc (₹248.9572 Mn)
  ✅ PASS: EBITDA = Gross Profit - Total Opex (₹301.9530 Mn)
  ✅ PASS: EBITDA % = (EBITDA / Revenue) * 100 (49.20%)
  ✅ PASS: Capex metric verified (₹28.62 Mn)
  ✅ PASS: Collection metric verified (₹532.44 Mn)
  ✅ PASS: Net Cash = Collection - Total Opex - Capex (₹254.85 Mn)

Test Group 6: MySQL-Backed AI Finance Assistant
  ✅ PASS: AI provides financial answer with bold metrics
  ✅ PASS: AI Model identifies as MySQL Finance Intelligence Agent
  ✅ PASS: AI provides verifiable SQL trace
  ✅ PASS: AI provides data evidence

Test Group 7: MySQL User Management
  ✅ PASS: User created in MySQL
  ✅ PASS: User retrieved by email from MySQL
  ✅ PASS: User updated via MySQL save()
  ✅ PASS: User deleted from MySQL

======================================================
RESULTS: 27 PASSED | 0 FAILED
======================================================
```

---

## 7. Zero-Cost Deployment Architecture

The application requires **$0.00 monetary cost**. Below are the two verified architectures:

### Option A: Local Zero-Cost Deployment (Recommended for Demos & Evaluations)
- **Frontend**: Runs locally via Vite (`npm run dev`) or served via Nginx static files.
- **Backend**: Runs on local Node.js (`npm start`) on port 4820.
- **Database**: Local MySQL 8.0 on `127.0.0.1:3306`.
- **Advantages**: 100% free, zero external latency, data stays fully on-device, instant responses.

### Option B: Cloud Zero-Cost Deployment (Free Tier Services)
If hosting publicly without cost:
1. **Frontend Hosting**:
   - **Provider**: **Vercel** or **Cloudflare Pages** (Free Hobby Tier).
   - **Configuration**: Root directory `frontend/`, build command `npm run build`, output directory `dist`.
2. **Backend Hosting**:
   - **Provider**: **Render.com** (Free Web Service) or **Koyeb** (Hobby Plan).
   - **Configuration**: Node.js web service, build command `cd backend && npm install`, start command `npm start`.
   - *Limitation*: Free web services spin down after 15 minutes of inactivity; initial cold-start takes ~30–45 seconds.
3. **Database Hosting**:
   - **Provider**: **Aiven for MySQL** (Free tier: 1 CPU, 1 GB RAM, 5 GB storage) or **TiDB Cloud Serverless** (5 GB free storage, MySQL 8.0 wire-compatible).
   - **Data Import**: Run `mysql -h <host> -u <user> -p <database> < backend/finance_data_dump.sql` to import the full dataset.
   - *Limitation*: Connection pooling should be limited to 5 connections to remain within free tier concurrency boundaries.

---

## 8. Operating Without External AI Services

The built-in **MySQL Financial Intelligence Agent** (`backend/aiService.js`) uses parameterized SQL analytical templates and native financial variance algorithms:
- Requires **zero API keys** (no OpenAI, no Google Gemini, no Anthropic credits needed).
- Fully understands financial questions regarding Revenue, Gross Profit, EBITDA, Costs, Budgets, Capex, Collections, and Net Cash.
- Guarantees read-only SQL safety (`SELECT` statements only).
- Renders dynamic chart specifications (`bar`, `line`, `doughnut`) directly from the verified database records.

# ✂️ Trimly

**Smart Scheduling Platform for Beauty Professionals**

---

## 🚀 Overview

**Trimly** is a modern scheduling and client management platform designed for beauty professionals who want full control over their time, clients, and revenue — without relying on a receptionist.

Built as a **self-managed system**, Trimly empowers each professional to manage their own agenda, optimize their workflow, and deliver a better client experience.

---

## ✨ Core Features

### 📅 Smart Scheduling

* Daily, weekly, and monthly calendar views
* Automatic conflict detection
* Service-based time blocking (duration-aware scheduling)
* Personal schedule control with read-only access to other professionals
* Custom time blocking (breaks, appointments, etc.)

---

### 👥 Client Management

* Global client database
* Autocomplete search during booking
* Full appointment history
* Birthday tracking (with automated discount logic)
* Notes and preferences per client

---

### 💇 Services

* Custom service catalog
* Define price and duration
* Activate/deactivate services dynamically

---

### 🎟️ Coupons & Discounts

* Percentage-based discount system
* Expiration date and usage limits
* Birthday-based coupon automation
* Real-time validation during booking

---

### 💰 Financial Tracking

* Automatic calculation of:

  * original value
  * discount
  * final value
* Revenue tracking per appointment
* Financial summaries and reports
* Average ticket insights

---

### 📊 Dashboard & Analytics

* Daily overview (appointments, revenue, availability)
* Upcoming appointments
* Birthday clients of the month
* Most requested services
* Top clients (frequency & spending)
* Cancellation & no-show rates

---

## 🧠 Product Philosophy

Trimly is built around three core principles:

* **Autonomy** → Professionals manage their own schedules
* **Clarity** → Clean, actionable insights
* **Efficiency** → Automation of repetitive tasks

---

## 🏗️ Tech Stack

### Frontend

* Next.js (App Router)
* React
* TypeScript

### Backend

* Supabase
* PostgreSQL
* Row Level Security (RLS)
* Database triggers & functions

### Infrastructure

* GitHub (version control)
* HostGator (deployment)

---

## 🔐 Security

* Supabase Authentication
* Row Level Security (RLS)
* Per-user data isolation
* Permission-based access control

---

## 📁 Project Structure

```bash
trimly-web/
  app/
  components/
  lib/
  types/
  hooks/
  public/
```

---

## ⚙️ Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/your-username/trimly.git
cd trimly-web
```

---

### 2. Install dependencies

```bash
npm install
```

---

### 3. Set environment variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=YOUR_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_KEY
```

---

### 4. Run the development server

```bash
npm run dev
```

---

## 🌐 Deployment

Planned production domain:

👉 https://trimly.net.br

---

## 📊 Database Architecture

The system is powered by a robust PostgreSQL schema including:

* relational data modeling
* business rules enforced at database level
* automated triggers
* secure access via RLS

Main entities:

* profiles
* clients
* services
* coupons
* appointments
* schedule_blocks
* financial_entries

---

## 🚧 Roadmap

* [ ] Full calendar UI experience
* [ ] Real-time updates
* [ ] WhatsApp integration
* [ ] Notifications system
* [ ] Mobile-first optimization
* [ ] SaaS multi-tenant version

---

## 👩‍💻 Author

**Bianca Delbage**
AI Product Designer · UX/UI · Front-end · AI Solutions

---

## 💡 Vision

Trimly is more than a scheduling tool — it's a **productivity layer for independent professionals**, helping them turn time into structured, scalable business operations.

---

## 📄 License

Private project.

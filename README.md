# SchedulerPro 🗓️⚡

> Automated, conflict-free university timetable and course scheduling platform powered by **Google OR-Tools CP-SAT**, **Astro**, **Tailwind CSS**, and **Supabase**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Framework: Astro](https://img.shields.io/badge/Framework-Astro_5-orange.svg)](https://astro.build)
[![Solver: Google OR-Tools](https://img.shields.io/badge/Solver-Google_OR--Tools_CP--SAT-green.svg)](https://developers.google.com/optimization)
[![Database: Supabase](https://img.shields.io/badge/Backend-Supabase-emerald.svg)](https://supabase.com)

---

## 🌟 Key Features

- **⚡ Constraint-Satisfaction Scheduling Engine**: Uses Google OR-Tools CP-SAT in Python to generate optimal, conflict-free course schedules honoring faculty availability, batch limits, room capacities, and break slots in seconds.
- **📊 Interactive Timetable & Conflict Visualizer**: Clean, modern calendar grid for filtering schedules by Batch, Professor, or Room with real-time conflict tracking.
- **🗄️ Supabase Cloud Backend**: Centralized data management for Professors, Rooms, Subjects, Batches, and Timetable slots with automated schema synchronizations.
- **✉️ Automated SMTP Dispatch**: One-click personalized schedule distribution to faculty members via automated email dispatches.
- **⚙️ Dynamic Configuration**: Flexible settings for working days, slot counts, lunch/break periods, and custom constraints.
- **🎨 Modern Developer UI**: Designed with Astro, Tailwind CSS, dark mode support, and Vercel-inspired typography and micro-interactions.

---

## 🏗️ Architecture & Tech Stack

- **Frontend / Fullstack**: [Astro](https://astro.build/) with TypeScript & Tailwind CSS
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Constraint Solver**: Python with [Google OR-Tools](https://developers.google.com/optimization/cp/cp_solver) (`cp_model.CpModel`)
- **Email Service**: [Nodemailer](https://nodemailer.com/)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `>= 22.12.0`
- **Python**: `>= 3.9`
- A free **Supabase** project

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/RishabhDev817/scheduler-pro.git
cd scheduler-pro

# Install Node dependencies
npm install

# Install Python optimizer requirements
pip install -r scripts/requirements.txt # (or: pip install ortools python-dotenv supabase)
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in your credentials in `.env`:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-supabase-key

# Email notifications (optional)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_EMAIL=your-email@example.com
SMTP_PASSWORD=your-app-password
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

---

## 📂 Project Structure

```text
├── scripts/
│   ├── generate_schedule.py    # Core OR-Tools CP-SAT constraint solver script
│   └── ...                     # Database inspection and utility scripts
├── src/
│   ├── layouts/                # Astro page layouts
│   ├── pages/
│   │   ├── api/                # API endpoints (timetable, conflicts, settings, batches)
│   │   ├── dashboard.astro     # Timetable visualizer & management dashboard
│   │   ├── conflicts.astro     # Real-time conflict inspection
│   │   └── index.astro         # Hero landing page
│   └── styles/                 # Global styles and Tailwind configuration
├── settings.json               # Scheduling slots and day configuration
└── astro.config.mjs
```

---

## 📜 License

MIT © [Rishabh Dev](https://github.com/RishabhDev817)

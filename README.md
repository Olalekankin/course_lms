# Frontend Interview Mastery LMS

A premium, interactive Learning Management System (LMS) designed for frontend developers preparing for technical interviews. The platform is pre-loaded with a syllabus of **24 comprehensive lessons** covering core JavaScript, Functions, Arrays, and Objects.

## Core Progression Rules
*   **Sign-Up & Login:** Users must authenticate to track individual progress.
*   **Linear Learning Path:** The course starts with Lesson `1.1` unlocked. The remaining 23 lessons are locked.
*   **Unlock Mechanics:** A student must open the active lesson, read the content, and pass the **Interview Challenge** (consisting of 3 quiz questions: single choice, multi-choice, and short answer) to unlock the next sequential lesson.
*   **Visual Dashboards:** Includes a progress tracking header showing completion percentages, visual module dividers, interactive cards showing topic objectives, and a split-screen lesson workspace.

---

## Tech Stack
*   **Frontend:** React (Vite), Redux Toolkit (auth & course state), Tailwind CSS, Lucide Icons, React Markdown, React Syntax Highlighter, Canvas Confetti.
*   **Backend:** Node.js, Express, Local File-based DB (`db.json` for users and progress, `courseData.json` for content).
*   **Database (Next Version):** Clean Repository pattern designed for direct migration to MongoDB.

---

## Folder Structure
```text
/Interview
├── /backend
│   ├── /controllers     # Request handlers (auth, course progress)
│   ├── /data            # db.json (users) and courseData.json (lessons)
│   ├── /routes          # API route definitions
│   ├── /utils           # File-based DB read/write helper
│   ├── package.json
│   └── server.js        # Entry server script
├── /frontend
│   ├── /src
│   │   ├── /components  # Reusable UI elements (CodeBlock, QuizPanel)
│   │   ├── /pages       # Dashboard, LessonViewer, Login, Signup
│   │   ├── /store       # Redux Toolkit Slices (auth, course)
│   │   ├── App.jsx
│   │   └── index.css    # Core Tailwind styles & custom animations
│   ├── package.json
│   └── tailwind.config.js
└── README.md            # This documentation
```

---

## Development Phases & Git Branch Strategy
Development is structured into feature-based sprints. Each feature is developed on a dedicated branch and merged into the `dev` branch for stability testing before deploying to `main` (production-stable release).

1.  **Feature 1 (Setup):** Initialize git, main/dev branches, and repository README.
2.  **Feature 2 (Backend Core):** Build the Express server, JWT/bcrypt auth, and progression APIs using the local JSON DB. (Branch: `feature/backend-core`)
3.  **Feature 3 (Frontend Setup):** Scaffold Vite, Tailwind custom styling variables, Redux store, and Router. (Branch: `feature/frontend-foundation`)
4.  **Feature 4 (Auth UI):** Design responsive Login/Signup pages and connect auth API hooks. (Branch: `feature/auth-ui`)
5.  **Feature 5 (Dashboard UI):** Create the dashboard containing progress metrics and locked/unlocked lesson cards. (Branch: `feature/dashboard-ui`)
6.  **Feature 6 (Lesson Viewer & Quiz):** Build split-screen workspace, markdown reader with code highlighting, quiz engines, progression triggers, and confetti effects. (Branch: `feature/lesson-viewer-ui`)
7.  **Feature 7 (Integration & Stable Release):** Complete end-to-end testing, bug fixing, and merge final branches. (Branch: `feature/e2e-integration`)

---

## Getting Started

### 1. Backend Server Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend client Setup
```bash
cd frontend
npm install
npm run dev
```

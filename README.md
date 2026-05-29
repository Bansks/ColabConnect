# ColabConnect

> *Find your perfect collaborator, build together, earn trust*

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2-green?logo=springboot)](https://spring.io/projects/spring-boot)
[![Java](https://img.shields.io/badge/Java-19-blue?logo=openjdk)](https://adoptium.net/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-purple?logo=websocket)](https://stomp.github.io/)
[![Aesthetic](https://img.shields.io/badge/UI-Microsoft%20Teams-6264a7?logo=microsoftteams)](https://boxicons.com/)

**ColabConnect** is a premium, full‑stack collaboration platform where developers, designers, and creators discover each other, manage projects together, and build a reputation through peer endorsements. The system is powered by **real‑time WebSockets chat**, a robust **Lombok‑free Java backend**, and a **Teams‑inspired fluid user interface** supporting dynamic light and dark modes.

---

## Features at a Glance

| Component | Description |
|-----------|-------------|
| **Discover People** | Search by skill, availability, and work style with instant popular tag filtering |
| **Project Hub** | Create projects, invite members, and track status (open → active → completed) |
| **Real‑time Chat** | Project rooms and direct messages powered by WebSockets, with unlimited messaging after connection |
| **Connection System** | Send join requests to establish connections, unlock communication, and allow project invitations |
| **Peer Ratings** | Rate teammates after project completion to build reliability scores and endorsements |
| **Skill‑based Matching** | Align project requirements with user competencies to find the optimal collaborator fit |
| **Secure Authentication** | HttpOnly session cookies with concurrent JSON file storage for session persistence |
| **Light and Dark Theme Toggle** | Fluid, GPU‑accelerated transitions with client‑side `localStorage` state persistence |
| **FOUC Prevention** | Synchronous head initializer scripts that eliminate unstyled flashing during page reloads |
| **Dynamic Avatars** | Hash‑based dynamic pastel gradient backgrounds for user initials with contrast‑based text color inversion |
| **Glassmorphic Project Squircles** | Glassmorphic briefcase indicators replacing legacy solid sidebar blocks |
| **Lombok‑Free Architecture** | Fully compiled standard Java models resolving AST/IDE compiler compatibility blocks |
| **Collapsible Tasks Side-Panel** | Collapsible right‑hand sidebar displaying Pending, In‑Progress, and Completed project tasks in real‑time |
| **Timezone-Safe Google Calendar** | Instant, zero‑auth calendar URL rendering with safe local offset calculations |
| **iCalendar (.ics) Invites** | RFC‑5545 compliant calendar invitation file generation and download endpoint |
| **Full-Width Profile Dashboard** | Fully‑responsive, full‑width dashboard grid featuring rich metrics, skills inventory, and verified testimonial feeds |

---

## Technical Stack

| Layer | Technology |
|---|---|
| **Backend** | Spring Boot 3, Java 19 (fully standard, Lombok-free) |
| **Real‑time** | Spring WebSocket + STOMP + SockJS + webjars-locator-core |
| **Persistence** | ConcurrentHashMap + Jackson JSON file storage (`data/*.json`) |
| **Frontend** | Thymeleaf SSR, Vanilla JavaScript, Boxicons |
| **Styling** | Custom Vanilla CSS (fluid light/dark modes, glassmorphism, responsive) |
| **Build** | Maven |

---

## Quick Start

### Prerequisites
- Java 19+
- Maven

### 1. Clone & Build
```bash
git clone https://github.com/bansks/colabconnect.git
cd colabconnect
mvn clean package
```

### 2. Run
```bash
java -jar target/colabconnect-0.0.1-SNAPSHOT.jar
```
Or from your preferred IDE, execute `ColabConnectApplication.java`


---

## Project Structure

```
colabconnect/
├── src/main/java/com/colabconnect/
│   ├── config/               # Auth interceptors, WebSocket configurations
│   ├── controller/           # REST API endpoints + HTML View controllers
│   ├── model/                # Plain standard Java entities (Lombok-free)
│   ├── repository/           # Repository interfaces + JSON file database logic
│   │   └── json/             # Concurrent file storage handling
│   └── service/              # Business logic helpers
├── src/main/resources/
│   ├── static/               # Client assets
│   │   ├── css/styles.css    # Premium CSS Variable theme systems
│   │   └── js/               # JavaScript pages modules (chat.js, app.js, etc.)
│   ├── templates/            # Thymeleaf HTML page layers (layout.html fragment, etc.)
│   └── application.properties # Server port & static resource definitions
├── data/                     # Generated at runtime - Jackson JSON flat database
│   ├── users.json
│   ├── projects.json
│   ├── sessions.json
│   ├── connections.json
│   ├── chats_projects.json
│   ├── chats_dms.json
│   └── ratings.json
└── pom.xml
```

---

## Core Workflows and Project Architecture

### 1. Unified Real-Time Task Management
ColabConnect features a highly integrated To-Do sidebar panel in project chats that synchronizes in real-time across all online project co-members:
- **Creation Rights**: Any project member can instantly create a task.
- **Floating Modals**: Clicking the `+` button in the chat footer opens a fixed-coordinate **Centered Task Creation Dialog** (`450px` width, squircle corners).
- **Deletion Rights**: Restricted exclusively to the original **task creator** (`task.createdById`) to prevent unauthorized deletion.
- **Dynamic Categories**: Tasks flow smoothly between **Pending**, **In-Progress**, and **Completed** sections via quick status checks.

### 2. Timezone-Safe Calendar Sync
- **Add to Google Calendar**: Calculates local timezone offsets safe from date-inversion errors. Launches a zero-auth Google event template populated with project descriptions and dueDate values in a separate tab.
- **iCalendar Invite (.ics) Downloads**: Tapping the calendar icon generates an RFC-5545 compliant calendar file dynamically returned as an attachment via `GET /cc/projects/{projectId}/todos/{taskId}/ics`.

### 3. Dynamic Visual Theme System
- **GPU-Optimized Transitions**: Global styles smoothly shift backgrounds, surface cards, inputs, and borders over `0.25s` on a fluid color curve.
- **Dynamic Avatars**: Teammates' textual initials are generated with dynamic hash-based pastel HSL gradients. Light backgrounds automatically trigger **dark charcoal `#0f172a` text inversion** and dark backgrounds trigger **white `#ffffff` text** to ensure maximum legibility.
- **Glassmorphic Project Squircles**: Sidebar channels host clean transparent backgrounds (`rgba(98, 100, 167, 0.08)`) with a light purple outline border (`rgba(98, 100, 167, 0.2)`).
- **Clean 1-to-1 DMs**: Individual message bubbles dynamically omit redundant round avatars and sender names in direct messages (`mode === 'dm'`), creating an elegant, uncluttered presentation.

---

## API Endpoints Overview

| Category | Method | Endpoint | Description |
|----------|--------|----------|-------------|
| **Auth** | POST | `/cc/auth/register` | Create account |
| | POST | `/cc/auth/login` | Login (sets secure HttpOnly cookie) |
| | POST | `/cc/auth/logout` | Logout |
| **Users** | GET/PUT | `/cc/users/me` | Retrieve / Update personal profile |
| | GET | `/cc/users?query=...` | Search registered collaborators |
| **Projects** | GET | `/cc/projects?scope=mine/all` | List active workspace projects |
| | POST | `/cc/projects` | Create a new project workspace |
| | POST | `/cc/projects/{id}/complete` | Cast vote to complete active project |
| | POST | `/cc/projects/{id}/rate/{userId}` | Rate teammate post‑project completion |
| **To-Do Tasks** | GET/POST | `/cc/projects/{id}/todos` | Fetch / Create project tasks |
| | PATCH | `/cc/projects/{id}/todos/{taskId}`| Update task status (`pending`, `in-progress`, `done`) |
| | DELETE | `/cc/projects/{id}/todos/{taskId}`| Delete task (creators only) |
| | GET | `/cc/projects/{id}/todos/{taskId}/ics`| Download RFC-5545 `.ics` calendar invitation |
| **Chat & DM** | GET/POST | `/cc/chat/{projectId}` | Fetch / Send messages in project rooms |
| | GET | `/cc/dm` | List current active direct messages |
| | GET/POST | `/cc/dm/{userId}` | Fetch / Send direct messages with a member |
| **Connections** | GET | `/cc/connections/requests` | List incoming project joining requests |
| | POST | `/cc/connections/request/{id}` | Dispatch invitation / join request |
| | PUT | `/cc/connections/respond/{reqId}`| Accept or decline connection request |



## Acknowledgements
- [Boxicons](https://boxicons.com/) for dynamic icon assets
- [STOMP.js](https://stomp-js.github.io/stomp-websocket/) for WebSockets messaging
- Microsoft Teams for aesthetic design directions

**Developed using Java 19 and Spring Boot** – *connect, build, shine.*
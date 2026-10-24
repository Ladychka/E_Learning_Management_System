# ELMS Backend Documentation

This directory contains all project documentation organized by category.

## Folder Structure

```
docs/
├── README.md                           # This file
├── CHANGELOG.md                        # Project changelog (kept at root for visibility)
│
├── api/                                # API documentation
│   └── 03_API_DOCUMENTATION.md
│
├── architecture/                       # System architecture & design docs
│   └── 02_TECHNICAL_ARCHITECTURE.md
│
├── database/                           # Database schemas & data models
│   └── 06_DATABASE_SCHEMA.md
│
├── general/                            # High-level project information
│   └── 01_PROJECT_OVERVIEW.md
│
├── guides/                             # Setup, onboarding & how-to guides
│   └── 07_SETUP_GUIDE.md
│
├── logs/                               # Session logs & activity records
│   └── 09_SESSION_LOG_2026-07-24.md
│
├── mobile/                             # Flutter mobile app plans & specs
│   └── 09_MOBILE_APP_PLAN.md
│
├── planning/                           # Roadmaps, next steps & future plans
│   └── 10_NEXT_STEPS.md
│
├── requirements/                       # User stories, requirements & specs
│   └── 08_USER_STORIES.md
│
└── sprints/                            # Sprint-specific documentation
    ├── plans/                          # Sprint plans & goals
    │   ├── 05_SPRINT_2_PLAN.md
    │   └── 06_SPRINT_3_PLAN.md
    │
    └── reports/                        # Sprint reports & retrospectives
        ├── 04_SPRINT_1_REPORT.md
        ├── 05_SPRINT_2_REPORT.md
        └── 06_SPRINT_3_REPORT.md
```

## Quick Reference

| Document | Location | Purpose |
|----------|----------|---------|
| Project Overview | `general/01_PROJECT_OVERVIEW.md` | Problem statement, objectives, scope, risk assessment |
| Technical Architecture | `architecture/02_TECHNICAL_ARCHITECTURE.md` | System diagrams, design principles, security layers |
| API Documentation | `api/03_API_DOCUMENTATION.md` | Full endpoint reference with request/response examples |
| Sprint 1 Report | `sprints/reports/04_SPRINT_1_REPORT.md` | Sprint 1 completion: auth, user management, basic courses |
| Sprint 2 Plan | `sprints/plans/05_SPRINT_2_PLAN.md` | Sprint 2 plan: curriculum, content, quizzes |
| Sprint 2 Report | `sprints/reports/05_SPRINT_2_REPORT.md` | Sprint 2 completion: modules, lessons, quizzes, uploads |
| Sprint 3 Plan | `sprints/plans/06_SPRINT_3_PLAN.md` | Sprint 3 plan: enrollment, assignments, quiz taking |
| Sprint 3 Report | `sprints/reports/06_SPRINT_3_REPORT.md` | Sprint 3 progress: enrollment, waitlist, assignments, quiz taking, certificates |
| Database Schema | `database/06_DATABASE_SCHEMA.md` | Complete table reference, columns, relationships |
| Setup Guide | `guides/07_SETUP_GUIDE.md` | Prerequisites, installation, env variables, troubleshooting |
| User Stories | `requirements/08_USER_STORIES.md` | All 100 user stories with status tracking |
| Mobile App Plan | `mobile/09_MOBILE_APP_PLAN.md` | Flutter app user stories, screens, API contracts |
| Session Log | `logs/09_SESSION_LOG_2026-07-24.md` | Development session activity record |
| Next Steps | `planning/10_NEXT_STEPS.md` | Roadmap and upcoming priorities |

## Naming Convention

- Use `UPPER_SNAKE_CASE` for document filenames
- Prefix with numbers (`01_`, `02_`) if a specific reading order is desired within a folder
- Use descriptive names that clearly indicate the document's purpose

## Adding New Documents

1. Choose the appropriate folder for your document type
2. Follow the naming convention above
3. If adding a new category, update this README

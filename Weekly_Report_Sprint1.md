# WEEKLY REPORT – SPRINT 1 (WEEK 2)

**Date:** October 18, 2026  
**Project:** Roommate Finder App  

---

## 1. Completed Tasks

During this week, my team focused on preparing for the PA1 milestone. We worked on the project documents, set up the project repository, and prepared the initial UI/UX prototypes.

### Task 1: Draft PA1 Project Plan and Vision Document

- **Assignees:** Nguyễn Khang Hy & Nguyễn Trực Phúc & Phạm Hoàng Phúc
- **Created Date:** October 18, 2026
- **Due Date:** October 18, 2026
- **Last Updated:** October 18, 2026
- **Task Name:** Draft PA1 Project Plan and Vision Document

**Task Description:**

- Draft the Software Development Plan (SDP) based on the RUP template (`rup_sdpln_sp.dot`).
- Define the project phases, including Inception, Elaboration, and Construction.
- Create a development schedule consisting of five sprints.
- Draft the Vision Document (`rup_vision_sp.docx`), including the problem statement, key stakeholders (students and landlords), and core features such as Map Search, Matching Score, and Smart Room Ledger.

**Evidence:**  
<img width="2574" height="1528" alt="image" src="https://github.com/user-attachments/assets/1f20521f-eaa5-4636-84aa-e0f7b563b951" />


### Task 2: Set Up GitHub Repository and CI/CD

- **Assignee:** Phạm Hoàng Phúc
- **Created Date:** October 18, 2026
- **Due Date:** October 18, 2026
- **Last Updated:** October 18, 2026
- **Task Name:** Set Up GitHub Repository and add members

**Task Description:**

- Create the main project repository on GitHub.
- Add all team members as collaborators and configure branching rules for future development.
- Create a branch for weekly reports to keep report files organized and separate from the main branch.
- Upload the weekly report to the repository and commit the changes.

**Evidence:**  
<img width="2578" height="1516" alt="image" src="https://github.com/user-attachments/assets/96d5d2be-8524-41db-b936-40411a674504" />


**Git Commit Log:**

```text
commit c276817
Author: Pham Hoang Phuc
Date:   Oct 18, 2026, 06:49 PM

    docs: initial commit
```

### Task 3: Design UI/UX Prototypes for Core Features

- **Assignee:** Lê Đinh Nguyên Phong & Nguyễn Khang Hy
- **Created Date:** October 18, 2026
- **Due Date:** October 18, 2026
- **Last Updated:** October 18, 2026
- **Task Name:** Design UI/UX Prototypes for Core Features

**Task Description:**

- Use the AI-powered tool v0.dev to quickly generate UI sketches for the application's four core screens:
  1. Post a Room / Listing Form.
  2. Hyper-local Map Search.
  3. Roommate Matching Profile.
  4. Smart Room Ledger and VietQR Bill Splitting.
- Combine the screens and their descriptions into a final PDF for submission.

**Evidence:**  
<img width="3024" height="1798" alt="image" src="https://github.com/user-attachments/assets/166f1967-1e88-4881-a30f-7fcf79156468" />


### Task 4: Write Weekly Report for Sprint 1
* **Assignee:** Nguyễn Trực Phúc & Lê Đinh Nguyên Phong
* **Created Date:** October 18, 2026
* **Due Date:** October 18, 2026
* **Last Updated:** October 18, 2026
* **Task Name:** Write Weekly Report for Sprint 1
* **Task Description:**
  * Summarize completed tasks, outline upcoming tasks for the next sprint, and document current project issues.
  * Format the report using standard Markdown conventions.
  * Push the report to the GitHub repository (`report` branch) to maintain the Git commit log as required by the course guidelines.
* **Evidence:**
<img width="2576" height="1528" alt="image" src="https://github.com/user-attachments/assets/03961820-18c1-415f-8a08-d8d9f04c1d5c" />


---

## 2. Tasks to Do

In the next week, the team will move into Sprint 2. The main goals are to collect real rental data and design the initial database structure.

### Task 4: Design Database ERD (Rooms, Users, Bills)

- **Assignee:** Lê Đinh Nguyên Phong & Phạm Hoàng Phúc
- **Created Date:** October 18, 2026
- **Due Date:** October 25, 2026
- **Last Updated:** October 18, 2026
- **Task Name:** Design Database ERD (Rooms, Users, Bills)

**Task Description:**

- Analyze the requirements in the Vision Document and design the Entity-Relationship Diagram (ERD).
- Define the main tables: `Users` (students and landlords), `Rooms` (location, price, and amenities), `Matches` (matching scores), and `Utility_Bills` (monthly records and payment status).
- Choose PostgreSQL as the primary database and plan for PostGIS support to enable future location-based map queries.

**Evidence:**  
<img width="2556" height="1346" alt="image" src="https://github.com/user-attachments/assets/6946e9b6-49ac-49a3-8470-5d301ab12691" />


### Task 5: Collect Real Data for 50 Rental Rooms in Làng Đại Học

- **Assignee:** Nguyễn Khang Hy & Nguyễn Trực Phúc
- **Created Date:** October 18, 2026
- **Due Date:** October 25, 2026
- **Last Updated:** October 18, 2026
- **Task Name:** Collect Real Data for 50 Rental Rooms in Làng Đại Học

**Task Description:**

- Conduct a field survey or collect information from local Facebook groups to gather 50 realistic rental listings in the VNU-HCM university area.
- Standardize the collected data, including images, prices, coordinates, and amenities.
- Store the data in CSV or JSON format to help reduce the cold-start risk identified in the Project Plan.

**Evidence:**  
<img width="2542" height="1490" alt="image" src="https://github.com/user-attachments/assets/677e14b9-02e3-490e-9822-0ed8789298c1" />


---

## 3. Issues and Solutions

During this week, the team faced several challenges. We discussed them and identified initial solutions.

### Issue 1: Document Formatting Problems

When using the course's RUP templates (`.dot` and `.docx`) in Microsoft Word, team members encountered font formatting issues. Collaborative editing was also difficult.

**Solution:**

The team agreed to move document editing to Google Docs. This allows members to work together in real time. The documents will then be exported to PDF for submission.

### Issue 2: Choosing a UI/UX Design Approach

The team considered creating the UI designs manually or using Figma. However, both options could require a significant amount of time.

**Solution:**

We used the AI-powered tool v0.dev to generate the initial UI designs more efficiently. The resulting interfaces follow the project's Mobile-First Web App approach and help reduce the time needed for prototyping.

---

## 4. Summary

During Sprint 1, Week 2, the team focused on preparing the project documents, setting up the GitHub repository, and developing the initial UI/UX prototypes. These tasks helped establish a foundation for the next development phase.

In Sprint 2, the team will focus on designing the database structure and collecting real rental data. These activities will support the development of the application's core features and help address the cold-start problem.

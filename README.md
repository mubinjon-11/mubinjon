# Bilim Yurti

Create a modern, fully functional educational web platform using HTML, CSS, JavaScript (and backend if needed).

1. Language Requirement

 Entire platform MUST be in Uzbek language (all UI, buttons, messages, results)

2. Authentication System

 Register/login with email and password

 During registration, user selects role:

 O‘qituvchi

 O‘quvchi

3. Teacher Features (O‘qituvchi)

 Teacher dashboard

 Create tests:

 Fan

 Mavzu

 Savollar soni

 Option to manually input questions and answers

 Tests must be saved in database and reusable

4. Student Features (O‘quvchi)

After login, show Student Dashboard with:

🔹 Darajalar ko‘rsatkichi (NEW FEATURE)

 Show each subject and current level:

 Example:

 Ingliz tili → B1

 Matematika → O‘rta daraja

 Levels must be calculated based on previous test results

 If no test taken → show “Aniqlanmagan”

🔹 1. Oddiy test yaratish

Student selects:

 Sinf

 Fan (10 ta fan)

 Mavzu

 Savollar soni

Logic:

 If teacher-created tests exist → use them

 Otherwise → generate using AI

🔹 2. Darajani aniqlash

 Choose subject

 Generate exactly 20 questions

 After completion:

 Languages → CEFR levels (A1–C2)

 Other subjects → Uzbekistan National Certification levels

5. Test Process (Core Logic)

 Show questions clearly

 After ALL questions answered:

 Show “Tugatish” button

 On click:

 Display:

 To‘g‘ri javoblar

 Noto‘g‘ri javoblar

 Umumiy ball (score)

 Save result to database

6. Level Calculation System (IMPORTANT)

 System must:

 Store all test results

 Calculate level dynamically based on performance

 Example logic:

 90–100% → Yuqori daraja

 70–89% → O‘rta daraja

 50–69% → Boshlang‘ich+

 <50% → Boshlang‘ich

 Dashboard must always show latest level per subject

7. UI/UX

 Clean modern design

 Top navigation:

 Oddiy test yaratish

 Darajani aniqlash

 Responsive design

8. Data Storage

 Store:

 Users

 Roles

 Tests

 Results

 Levels (or calculate dynamically)

9. Technical Stack

 Frontend: HTML, CSS, JS (or React)

 Backend: Node.js / Firebase / Supabase

 Dynamic system (no hardcoded data)

10. AI Test Generation

 Generate:

 Relevant questions

 Multiple choice answers

 Correct answers

 Avoid repetition

 Match grade, subject, topic

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://mubinjon.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25291015-7d7c-4ed0-833d-36fa712734e0).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

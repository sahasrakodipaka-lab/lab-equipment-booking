# Lab Equipment Booking

A beginner-friendly full-stack college project for browsing laboratory equipment and submitting booking requests. Students can check a request using a private booking code; an administrator can review requests, change their status, and add equipment.

## 1. Problem statement

Laboratories often manage shared equipment through paper registers or informal messages. That can make it difficult to see what equipment exists, record who requested it, and track approval status. LabBook provides one small web portal for these tasks.

## 2. Objectives

- Display a searchable catalogue of laboratory equipment.
- Accept booking requests with a requested time range and purpose.
- Check for overlapping pending/approved requests before saving.
- Let a student look up or cancel their own pending request using a private code.
- Let a protected administrator review requests, update statuses, and add equipment.

## 3. Users and features

**Student / requester**
- Browse and search equipment.
- Submit a request with name, college email, time range, and purpose.
- Receive a booking ID and one-time-displayed private booking code.
- Look up status and cancel a pending request.

**Lab administrator**
- Open the Admin panel using a secret key configured by the project owner.
- View up to 300 recent requests.
- Mark requests pending, approved, rejected, cancelled, or completed.
- Add equipment to the catalogue.

This MVP does not include student accounts, email notifications, file uploads, or a separate approval email workflow.

## 4. Technology stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js, Express
- Database: Supabase PostgreSQL
- Version control: Git and GitHub

## 5. Folder structure

```text
lab-equipment-booking/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── middleware/
│   │   └── admin.js
│   ├── routes/
│   │   ├── admin.js
│   │   ├── bookings.js
│   │   └── equipment.js
│   ├── utils/
│   │   └── validation.js
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── supabase.js
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 6. Prerequisites

Install:
- [Visual Studio Code](https://code.visualstudio.com/)
- [Node.js LTS](https://nodejs.org/) (Node 20 or newer)
- [Git](https://git-scm.com/downloads)
- A free [Supabase](https://supabase.com/) account

After installing Node.js, open a new terminal and verify:

```powershell
node --version
npm --version
git --version
```

Each command should print a version number.

## 7. Supabase setup

1. Sign in to Supabase and create a new project. Give it a name such as `lab-equipment-booking`.
2. Set a strong database password and keep it private.
3. Wait for the project to finish provisioning.
4. In the project dashboard, open **SQL Editor** and choose **New query**.
5. Open `database/schema.sql` from this project, copy its complete contents, paste it into the SQL Editor, and click **Run**.
6. Open **Table Editor** and confirm that `equipment` and `bookings` exist. The equipment table should contain six sample equipment records.
7. Open **Project Settings → API** (or the project's API/keys page). Copy the Project URL and the server-side `service_role`/secret key. The dashboard labels may vary.
8. Keep the service-role key private. It bypasses Row Level Security and must never be put in frontend files or committed to GitHub.

The SQL script enables RLS and blocks direct browser access to the tables. This app accesses the database through the Express server, where the secret key stays on the server.

## 8. Environment configuration

Open `backend/.env` and replace the empty values:

```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_actual_server_side_key
ADMIN_API_KEY=your_long_random_admin_secret
```

- `SUPABASE_URL`: Project URL from Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: secret server-side key. Never share or publish it.
- `ADMIN_API_KEY`: a private key used to protect admin API endpoints.
- `PORT`: local server port.
- `NODE_ENV`: set to `development` for local work.

Generate a strong admin key in PowerShell with Node.js:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the generated value into `ADMIN_API_KEY`. Do not put real credentials into `.env.example`; that file is only a template. `.env` is ignored by Git.

## 9. Install and run (Windows)

1. Extract the ZIP to a folder you can find easily.
2. Open VS Code, choose **File → Open Folder**, and select `lab-equipment-booking`.
3. Choose **Terminal → New Terminal**. The terminal should be in the root project folder.
4. Enter the backend folder:

   ```powershell
   cd backend
   ```

5. Install dependencies:

   ```powershell
   npm install
   ```

   npm downloads Express, Supabase's JavaScript client, dotenv, Helmet, and the rate limiter. It creates/updates `package-lock.json`.

6. Configure `backend/.env` as described above.
7. Start the server:

   ```powershell
   npm start
   ```

   Expected message: `Lab Equipment Booking is running at http://localhost:3000`

8. Open `http://localhost:3000` in your browser. Do not open `frontend/index.html` directly; use the local server so `/api` requests work.
9. Check `http://localhost:3000/api/health`. A successful response resembles:

   ```json
   {"ok":true,"message":"Lab Equipment Booking API is running."}
   ```

10. Keep the terminal open while using the application. Press `Ctrl+C` in that terminal to stop the server.

For development with automatic restart, use `npm run dev`.

## 10. Architecture

1. The browser loads HTML, CSS, and Vanilla JavaScript from `frontend/`.
2. Browser JavaScript uses `fetch()` to call `/api/...` endpoints on Express.
3. Express validates requests and performs database queries using `backend/supabase.js`.
4. Supabase PostgreSQL stores equipment and bookings.
5. Admin endpoints require the `X-Admin-Key` header. Student booking lookup/cancellation requires the private booking code.

## 11. API endpoints

All responses are JSON unless noted. The admin key is required for `/api/admin/...`; a booking code is required for lookup and cancellation.

| Method | Path | Purpose | Request | Access |
|---|---|---|---|---|
| GET | `/api/health` | Check server health | None | Public |
| GET | `/api/equipment` | List active equipment | None | Public |
| POST | `/api/bookings` | Create a booking request | `equipmentId`, `studentName`, `studentEmail`, `startAt`, `endAt`, `purpose` | Public; validated |
| GET | `/api/bookings/:id` | Retrieve one booking | `X-Booking-Code` header | Matching private code |
| POST | `/api/bookings/:id/cancel` | Cancel a pending booking | `X-Booking-Code` header | Matching private code |
| GET | `/api/admin/bookings` | List recent bookings | `X-Admin-Key` header | Administrator |
| PATCH | `/api/admin/bookings/:id` | Change booking status | `{ "status": "approved" }` and admin header | Administrator |
| POST | `/api/admin/equipment` | Add equipment | `name`, `category`, `location`, `quantity`, optional `description`; admin header | Administrator |

Important responses:
- `201`: record created.
- `400`: invalid input.
- `401`: missing/invalid private or admin key.
- `404`: record not found or private code does not match.
- `409`: requested time overlaps existing requests for the equipment.
- `503`: database environment variables are not configured.
- `500`: operation failed on the server.

## 12. How to use

1. Browse the equipment catalogue or search by name/category/location.
2. Select **Book**, complete the form, and submit.
3. Save both the Booking ID and private booking code. The code is shown only once; it is stored hashed in the database.
4. Use the “Find your request” form to view status. A pending request can be cancelled.
5. To administer requests, open **Admin**, enter `ADMIN_API_KEY`, and review or update requests.
6. Use the Add equipment form to add another resource.

## 13. Manual testing checklist

| Test | Expected result |
|---|---|
| Open `/api/health` | JSON response with `ok: true` |
| Load the home page with correct Supabase config | Equipment cards appear |
| Search for a category or equipment name | Catalogue filters as text is entered |
| Submit a valid future booking | Request saved; ID and private code shown |
| Submit with a missing required field | Browser validation prevents submission |
| Use an end time before start time | Validation message appears |
| Request a time overlapping fully-booked equipment | API returns `409` |
| Look up with a correct ID and code | Status and request details appear |
| Look up with an incorrect code | Request is not disclosed |
| Cancel a pending request with its code | Status changes to cancelled |
| Open Admin with a wrong key | Access is denied |
| Add equipment using the valid admin key | New item appears in the catalogue |
| Update a booking status as admin | New status is saved |
| Stop the server and reload | API calls show a connection error |

Run a basic JavaScript syntax check from `backend/`:

```powershell
npm run check
```

This checks the backend JavaScript syntax. It does not prove that your remote Supabase credentials or database are configured correctly.

## 14. GitHub upload

Create an empty repository on GitHub (for example, `lab-equipment-booking`). Do not add a README on GitHub if the local project already has one.

In the VS Code terminal, move to the **root** folder, not the backend folder:

```powershell
cd ..
git init
git status
git add .
git status
git commit -m "Build Lab Equipment Booking project"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL shown by GitHub, for example `https://github.com/YOUR-USERNAME/lab-equipment-booking.git`.

Before `git commit`, check that `backend/.env` is not listed as a staged file and that `node_modules/` is not staged. `.env.example` should be included. A `.gitignore` file does not remove secrets that were committed previously; if a secret is exposed, rotate it immediately and remove it from repository history as appropriate.

GitHub Pages can host static files, but it cannot run this Express backend. This app needs the backend and environment variables on a Node.js hosting service if you later deploy it online.

## 15. Troubleshooting

- **“Database is not configured”**: check `backend/.env`, make sure there are no extra quotes/spaces in the values, save it, and restart the server.
- **Equipment does not load**: check the Supabase URL/key, confirm `database/schema.sql` ran successfully, and look at the terminal for server-side errors.
- **Invalid administrator key**: make sure the key in the Admin form exactly matches `ADMIN_API_KEY`; restart the server after changing `.env`.
- **`npm` is not recognized**: install Node.js LTS, close and reopen VS Code, and check `node --version`.
- **Port 3000 is busy**: set `PORT=3001` in `backend/.env` and restart; then visit `http://localhost:3001`.
- **Booking time conflict**: choose a different time. The app checks pending and approved bookings against equipment quantity.
- **Git says remote origin already exists**: run `git remote -v`; update the remote with `git remote set-url origin YOUR_GITHUB_REPOSITORY_URL`.

## 16. Security and limitations

- Never commit or expose the Supabase service-role key or admin key.
- The server uses Helmet, request-size limits, rate limiting, validation, and private booking-code hashing.
- The admin key is a simple project-demo protection mechanism, not a replacement for individual accounts, MFA, or a production identity provider. Use a strong key and do not deploy the demo with a shared key for sensitive institutional data.
- Availability is checked by the API before insertion. For a high-traffic production system, enforce overlap/quantity rules transactionally in PostgreSQL to avoid simultaneous-request race conditions.
- This project does not send emails, authenticate student accounts, or automatically delete old bookings.

## 17. Future enhancements

- Add Supabase Auth for individual student and administrator accounts.
- Send confirmation and reminder emails.
- Add calendar views, equipment images, and booking history.
- Add PostgreSQL transactional availability enforcement and audit logs.
- Add automated integration tests and deploy the API to a Node.js hosting provider.

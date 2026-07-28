# LMS Backend — Students, Trainings, Modules, Lessons, Enrollments

This adds everything on your checklist for backend item #1, built to match your
existing conventions exactly (Express + `pg`, JWT auth via `authMiddleware` +
`adminMiddleware`, multer → Google Drive for file storage, uuid ids generated
in app code).

## New files
```
src/migrations/001_lms_schema.sql        (run this once against your DB)
src/services/googleLmsService.js         (generic Drive upload/stream/delete)
src/middleware/uploadTrainingThumbnail.js
src/middleware/uploadLessonFile.js
src/controllers/studentController.js
src/controllers/trainingController.js
src/controllers/enrollmentController.js
src/controllers/moduleController.js
src/controllers/lessonController.js
src/routes/studentRoutes.js
src/routes/trainingRoutes.js
src/routes/lessonAssetRoutes.js
```

## Modified files
```
src/routes/adminRoutes.js     — added all the mutation routes below adminOnly
src/controllers/authController.js — login now blocks a student whose status is 'inactive'
src/app.js                    — mounted the three new routers
```

## 1. Run the migrations
```
psql $DATABASE_URL -f src/migrations/001_lms_schema.sql
psql $DATABASE_URL -f src/migrations/002_assessments_schema.sql
```
This creates `students`, `training_programs`, `enrollments`, `modules`, `lessons`,
`assessments`, and `questions`.
Nothing existing is altered — `role = 'student'` just becomes a new value in
your existing `users.role` column (no enum/constraint exists on it today).

## 2. New environment variables (same Google service account you already use)
```
GOOGLE_TRAINING_FOLDER_ID      # Drive folder for training thumbnails
GOOGLE_LESSON_VIDEO_FOLDER_ID  # Drive folder for uploaded lesson videos
GOOGLE_LESSON_PDF_FOLDER_ID    # Drive folder for uploaded lesson PDFs
```
Create three folders in the same shared Drive your service account already
has access to, and drop their folder IDs in here. No new npm packages are
needed — this reuses `googleapis`, `multer`, `bcrypt`, `uuid`, all already in
your project.

## 3. Endpoints added (all match the frontend `src/api/*.js` calls exactly)

**Public-ish (still require an admin JWT, just not double-prefixed with `/admin`):**
- `GET /api/students`, `GET /api/students/:id`
- `GET /api/trainings`, `GET /api/trainings/:id`
- `GET /api/trainings/thumbnail/:fileId` — unauthenticated image proxy (same pattern as `/api/team/image/:fileId`)
- `GET /api/lessons/video/:fileId`, `GET /api/lessons/pdf/:fileId` — unauthenticated media proxies

**Admin (`/api/admin/...`, already behind `authenticate` + `adminOnly`):**
- Students: `POST /students`, `PUT /students/:id`, `DELETE /students/:id`, `PATCH /students/:id/status`, `POST /students/:id/reset-password`
- Trainings: `POST /trainings`, `PUT /trainings/:id`, `DELETE /trainings/:id` (multipart, field name `thumbnail`)
- Enrollments: `GET/PUT /students/:studentId/trainings`, `GET/PUT /trainings/:trainingId/students`
- Modules: `GET/POST /trainings/:trainingId/modules`, `PUT/DELETE /trainings/:trainingId/modules/:moduleId`, `PUT /trainings/:trainingId/modules/reorder`
- Lessons: `GET/POST /modules/:moduleId/lessons`, `PUT/DELETE /modules/:moduleId/lessons/:lessonId` (multipart, field names `video`/`pdf`), `PUT /modules/:moduleId/lessons/reorder`
- Assessments: `GET /assessments?attached_to_type=module|training&attached_to_id=:id`, `GET/POST /assessments`, `GET/PUT/DELETE /assessments/:id`
- Questions: `GET/POST /assessments/:assessmentId/questions`, `PUT/DELETE /assessments/:assessmentId/questions/:questionId`, `PUT /assessments/:assessmentId/questions/reorder`

## Assessment question configuration

`questions.config` stores question-type-specific JSON: multiple-choice options
and correct ids, fill-the-gap blanks, ordering items and correct order,
matching pairs, or an empty object for manually graded free-text questions.
An assessment attaches to exactly one module or training program, supporting
module quizzes and final training quizzes.

## Design decisions worth knowing about

- **Students have their own login.** Creating a student also creates a row in
  your existing `users` table (`role: 'student'`) with a random temp password,
  so they can eventually log into the employee portal with the same JWT auth
  you already have. There's no email service in this repo, so right now the
  temp password is (a) logged to the server console and (b) returned in the
  API response as `tempPassword` — wire up a real mailer when you build the
  portal, and remove it from the response at that point.
- **Delete = hard delete**, matching your confirm-dialog copy ("can't be
  undone from here"). Deleting a student removes their `users` row (cascades
  to `students` + `enrollments`). Deleting a training program cascades to its
  modules, lessons, and enrollments, and cleans up its Drive thumbnail file.
  This differs from the soft-delete (`is_active = false`) pattern jobs use —
  let me know if you'd rather these were reversible/archived instead.
- **Lesson videos** can be uploaded (up to 500MB, stored on Drive, streamed
  through your own domain like team/ad images) or linked externally
  (YouTube/Vimeo), matching `LessonForm.jsx`'s two-option UI.
- **Module/lesson ordering** uses a plain integer `position` column;
  `reorder` endpoints take the full ordered id list and rewrite positions in
  one transaction, matching the up/down-arrow reordering already in
  `TrainingProgramDetail.jsx`.
- **Inactive students can't log in** — `authController.login` now checks
  `students.status` for anyone with `role: 'student'` and returns 403 if
  they've been deactivated.

## Not yet done (next items on your list)
Assessments, progress tracking, certificates, and the employee portal are
still open — happy to pick up any of those next.

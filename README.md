# Student Profile API

A small project for managing student records. It has a REST API built with Express and MongoDB, and a simple web page on top so you can add, edit, and delete students without touching Postman.

## Author

- **Name:** Ousman Bah
- **Matric Number:** 22423253
- **Email:** ob22423253@utg.edu.gm

**Submitted for:** Express Backend Assignment

## Features

- Full CRUD for students
- Search by name or email, filter by course
- Pagination on the list endpoint
- Stats endpoint with total count, breakdown by course, and recent registrations
- Frontend page that talks to the API directly
- Swagger UI for trying out the endpoints
- Rate limiting, input sanitization, helmet, and CORS
- Jest tests with in-memory MongoDB
- GitHub Actions runs the tests on every push and PR

## Tech Stack

- Node.js + Express
- MongoDB with Mongoose
- express-validator for request validation
- Swagger (swagger-jsdoc + swagger-ui-express)
- Jest + supertest + mongodb-memory-server for testing
- Tailwind CSS (via CDN) and vanilla JS on the frontend

## Live Demo

https://student-profile-api-fpms.onrender.com — replace after deployment

## Getting Started

```bash
git clone <repo-url>
cd student-profile-api
npm install
```

Create a `.env` file in the project root (see `.env.example`):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb+srv://<user>:<password>@<cluster>/<db>
```

Then run:

```bash
npm run dev
```

The API and the frontend will be served at `http://localhost:5000`.

## Environment Variables

| Variable     | Description                          | Example                 |
|--------------|--------------------------------------|-------------------------|
| `PORT`       | Port the server listens on           | `5000`                  |
| `NODE_ENV`   | `development`, `production`, `test`  | `development`           |
| `MONGO_URI`  | MongoDB connection string            | `mongodb+srv://...`     |

## API Endpoints

| Method | Path                       | Description                                  |
|--------|----------------------------|----------------------------------------------|
| GET    | `/health`                  | Service health check                         |
| GET    | `/api`                     | API info and links                           |
| GET    | `/api/docs`                | Swagger UI                                   |
| GET    | `/api/students`            | List students (page, limit, q, course)       |
| POST   | `/api/students`            | Create a new student                         |
| GET    | `/api/students/stats`      | Stats: total, byCourse, recentlyRegistered   |
| GET    | `/api/students/:id`        | Get one student                              |
| PUT    | `/api/students/:id`        | Update a student                             |
| DELETE | `/api/students/:id`        | Delete a student                             |

## Example Requests

Create a student:

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "age": 28,
    "course": "Computer Science"
  }'
```

List with pagination and search:

```bash
curl "http://localhost:5000/api/students?page=1&limit=10&q=ada"
```

Get stats:

```bash
curl http://localhost:5000/api/students/stats
```

Update a student:

```bash
curl -X PUT http://localhost:5000/api/students/<id> \
  -H "Content-Type: application/json" \
  -d '{ "course": "Data Science" }'
```

Delete a student:

```bash
curl -X DELETE http://localhost:5000/api/students/<id>
```

## Running Tests

```bash
npm test
```

Tests use `mongodb-memory-server`, so you do not need a real database running.

For coverage:

```bash
npm run test:coverage
```

## Project Structure

```
config/         MongoDB connection
models/         Mongoose schemas
controllers/    Route handlers
routes/         Express routes
middleware/     Validation, error handling, 404
docs/           Swagger spec
public/         Frontend (HTML, JS, CSS)
postman/        Postman collection
tests/          Jest tests
server.js       App entry point
```


process.env.NODE_ENV = 'test';

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let app;
let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = require('../server');
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) await mongoServer.stop();
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

function validStudent(overrides = {}) {
  return {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: `ada+${Date.now()}${Math.random()}@example.com`,
    age: 28,
    course: 'Computer Science',
    ...overrides
  };
}

describe('GET /health', () => {
  it('returns ok and db state', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body).toHaveProperty('db');
  });
});

describe('GET /api', () => {
  it('returns info and links', async () => {
    const res = await request(app).get('/api');
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Student Profile API');
    expect(res.body.links).toHaveProperty('docs', '/api/docs');
    expect(res.body.links).toHaveProperty('students', '/api/students');
  });
});

describe('GET / (frontend)', () => {
  it('serves the index.html', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('Student Profile Manager');
  });
});

describe('POST /api/students', () => {
  it('creates a student with valid input', async () => {
    const payload = validStudent({ email: 'test1@example.com' });
    const res = await request(app).post('/api/students').send(payload);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('_id');
    expect(res.body.firstName).toBe('Ada');
    expect(res.body.email).toBe('test1@example.com');
    expect(res.body).toHaveProperty('createdAt');
  });

  it('lowercases the email', async () => {
    const res = await request(app).post('/api/students').send(validStudent({ email: 'UPPER@Example.COM' }));
    expect(res.status).toBe(201);
    expect(res.body.email).toBe('upper@example.com');
  });

  it('returns 422 when firstName missing', async () => {
    const res = await request(app).post('/api/students').send({
      lastName: 'Lovelace',
      email: 'a@b.com'
    });
    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty('errors');
    expect(res.body.errors.some((e) => e.field === 'firstName')).toBe(true);
  });

  it('returns 422 when email is invalid', async () => {
    const res = await request(app).post('/api/students').send(validStudent({ email: 'not-an-email' }));
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'email')).toBe(true);
  });

  it('returns 422 when firstName is too short', async () => {
    const res = await request(app).post('/api/students').send(validStudent({ firstName: 'A' }));
    expect(res.status).toBe(422);
  });

  it('returns 422 when age is out of range', async () => {
    const res = await request(app).post('/api/students').send(validStudent({ age: 999 }));
    expect(res.status).toBe(422);
    expect(res.body.errors.some((e) => e.field === 'age')).toBe(true);
  });

  it('returns 409 on duplicate email', async () => {
    const payload = validStudent({ email: 'dup@example.com' });
    await request(app).post('/api/students').send(payload).expect(201);
    const res = await request(app).post('/api/students').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toMatch(/duplicate/i);
  });
});

describe('GET /api/students', () => {
  beforeEach(async () => {
    const seed = [
      validStudent({ email: 'a@x.com', firstName: 'Alice', course: 'Math' }),
      validStudent({ email: 'b@x.com', firstName: 'Bob', course: 'Math' }),
      validStudent({ email: 'c@x.com', firstName: 'Carol', course: 'Physics' }),
      validStudent({ email: 'd@x.com', firstName: 'Dave', lastName: 'Smith', course: 'Physics' }),
      validStudent({ email: 'e@x.com', firstName: 'Eve', course: 'Biology' })
    ];
    for (const s of seed) {
      await request(app).post('/api/students').send(s).expect(201);
    }
  });

  it('lists with default pagination', async () => {
    const res = await request(app).get('/api/students');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(5);
    expect(res.body.pagination).toEqual({
      page: 1,
      limit: 10,
      total: 5,
      totalPages: 1
    });
  });

  it('paginates results', async () => {
    const res = await request(app).get('/api/students?page=1&limit=2');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination.totalPages).toBe(3);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.limit).toBe(2);
  });

  it('clamps limit to 100', async () => {
    const res = await request(app).get('/api/students?limit=500');
    expect(res.status).toBe(200);
    expect(res.body.pagination.limit).toBe(100);
  });

  it('coerces invalid page to 1', async () => {
    const res = await request(app).get('/api/students?page=-3');
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
  });

  it('searches by name (case-insensitive)', async () => {
    const res = await request(app).get('/api/students?q=alic');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].firstName).toBe('Alice');
  });

  it('searches by email', async () => {
    const res = await request(app).get('/api/students?q=b@x');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].email).toBe('b@x.com');
  });

  it('filters by course', async () => {
    const res = await request(app).get('/api/students?course=Math');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.data.every((s) => s.course === 'Math')).toBe(true);
  });

  it('combines search and filter', async () => {
    const res = await request(app).get('/api/students?q=Dave&course=Physics');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].firstName).toBe('Dave');
  });
});

describe('GET /api/students/stats', () => {
  it('returns zero stats when empty', async () => {
    const res = await request(app).get('/api/students/stats');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      total: 0,
      byCourse: [],
      recentlyRegistered: 0
    });
  });

  it('returns aggregated stats', async () => {
    await request(app).post('/api/students').send(validStudent({ email: 's1@x.com', course: 'CS' })).expect(201);
    await request(app).post('/api/students').send(validStudent({ email: 's2@x.com', course: 'CS' })).expect(201);
    await request(app).post('/api/students').send(validStudent({ email: 's3@x.com', course: 'Math' })).expect(201);

    const res = await request(app).get('/api/students/stats');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.recentlyRegistered).toBe(3);
    const cs = res.body.byCourse.find((c) => c.course === 'CS');
    expect(cs.count).toBe(2);
    const math = res.body.byCourse.find((c) => c.course === 'Math');
    expect(math.count).toBe(1);
  });
});

describe('GET /api/students/:id', () => {
  it('returns a student', async () => {
    const created = await request(app).post('/api/students').send(validStudent({ email: 'one@x.com' }));
    const res = await request(app).get(`/api/students/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('one@x.com');
  });

  it('returns 404 for missing id', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).get(`/api/students/${fakeId}`);
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/not found/i);
  });

  it('returns 400 for invalid ObjectId', async () => {
    const res = await request(app).get('/api/students/not-a-real-id');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/invalid/i);
  });
});

describe('PUT /api/students/:id', () => {
  it('updates a student', async () => {
    const created = await request(app).post('/api/students').send(validStudent({ email: 'up@x.com' }));
    const res = await request(app)
      .put(`/api/students/${created.body._id}`)
      .send({ course: 'Updated Course', age: 30 });
    expect(res.status).toBe(200);
    expect(res.body.course).toBe('Updated Course');
    expect(res.body.age).toBe(30);
  });

  it('returns 404 when student is missing', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).put(`/api/students/${fakeId}`).send({ course: 'X' });
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).put('/api/students/bad-id').send({ course: 'X' });
    expect(res.status).toBe(400);
  });

  it('returns 422 for invalid update payload', async () => {
    const created = await request(app).post('/api/students').send(validStudent({ email: 'inv@x.com' }));
    const res = await request(app).put(`/api/students/${created.body._id}`).send({ age: -5 });
    expect(res.status).toBe(422);
  });

  it('returns 409 when updating to duplicate email', async () => {
    const a = await request(app).post('/api/students').send(validStudent({ email: 'a@dup.com' }));
    await request(app).post('/api/students').send(validStudent({ email: 'b@dup.com' }));
    const res = await request(app).put(`/api/students/${a.body._id}`).send({ email: 'b@dup.com' });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/students/:id', () => {
  it('deletes a student', async () => {
    const created = await request(app).post('/api/students').send(validStudent({ email: 'del@x.com' }));
    const res = await request(app).delete(`/api/students/${created.body._id}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Student deleted', id: created.body._id });

    const after = await request(app).get(`/api/students/${created.body._id}`);
    expect(after.status).toBe(404);
  });

  it('returns 404 for missing student', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app).delete(`/api/students/${fakeId}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).delete('/api/students/bad-id');
    expect(res.status).toBe(400);
  });
});

describe('unmatched routes', () => {
  it('returns JSON 404 for /api/*', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toMatch(/route not found/i);
  });
});

describe('swagger docs', () => {
  it('serves the docs page', async () => {
    const res = await request(app).get('/api/docs/').redirects(1);
    expect([200, 301]).toContain(res.status);
  });
});

describe('404 page for non-API routes', () => {
  it('serves the 404 html page', async () => {
    const res = await request(app).get('/this-page-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/html/);
    expect(res.text).toContain('404');
  });
});

describe('error handling edge cases', () => {
  it('returns 400 for malformed JSON', async () => {
    const res = await request(app)
      .post('/api/students')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/invalid json/i);
  });
});

describe('config/db', () => {
  it('throws when MONGO_URI is missing', async () => {
    const original = process.env.MONGO_URI;
    delete process.env.MONGO_URI;
    const { connectDB } = require('../config/db');
    await expect(connectDB()).rejects.toThrow(/MONGO_URI/);
    if (original !== undefined) process.env.MONGO_URI = original;
  });
});

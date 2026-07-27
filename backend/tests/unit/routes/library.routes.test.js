const express = require('express');
const request = require('supertest');

let mockRole = 'tutor';
jest.mock('../../../src/middleware/authenticate', () => (req, _res, next) => {
  req.user = { id: 'tutor-id', role: mockRole };
  next();
});

jest.mock('../../../src/controllers/library.controller', () => ({
  validateResourceId: [],
  listResources: (_req, res) => res.status(200).json({ route: 'public-list' }),
  listMyResources: (_req, res) => res.status(200).json({ route: 'mine-list' }),
  getResource: (req, res) => res.status(200).json({ route: `public-detail:${req.params.id}` }),
  getManagedResource: (req, res) => res.status(200).json({ route: `mine-detail:${req.params.id}` }),
  createResource: (_req, res) => res.status(201).json({ route: 'create' }),
  updateResource: (_req, res) => res.status(200).json({ route: 'update' }),
  deleteResource: (_req, res) => res.status(200).json({ route: 'delete' }),
}));

const libraryRouter = require('../../../src/routes/api/v1/library.routes');

describe('library route visibility', () => {
  beforeEach(() => {
    mockRole = 'tutor';
  });

  it('does not let the public :id route swallow /mine', async () => {
    const app = express();
    app.use('/api/v1/library', libraryRouter);

    const list = await request(app).get('/api/v1/library/mine');
    const detail = await request(app).get('/api/v1/library/mine/pending-id');

    expect(list.status).toBe(200);
    expect(list.body.route).toBe('mine-list');
    expect(detail.status).toBe(200);
    expect(detail.body.route).toBe('mine-detail:pending-id');
  });

  it('rejects a student before the upload controller runs', async () => {
    mockRole = 'student';
    const app = express();
    app.use('/api/v1/library', libraryRouter);
    app.use((err, req, res, next) => {
      void req;
      void next;
      res.status(err.statusCode || 500).json({ code: err.errorCode });
    });

    const response = await request(app).post('/api/v1/library');

    expect(response.status).toBe(403);
    expect(response.body.code).toBe('AUTH_PERM_001');
  });
});

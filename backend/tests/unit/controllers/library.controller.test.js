const express = require('express');
const request = require('supertest');

jest.mock('../../../src/services/library.service', () => ({
  createResource: jest.fn(),
  listMyResources: jest.fn(),
}));

const libraryService = require('../../../src/services/library.service');
const libraryController = require('../../../src/controllers/library.controller');

describe('library.controller validation and owner listing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('stops before the service when create validation fails', async () => {
    const app = express();
    app.use(express.json());
    app.post('/library', ...libraryController.createResource);
    app.use((err, req, res, next) => {
      void req;
      void next;
      res.status(err.statusCode || 500).json({ code: err.errorCode });
    });

    const response = await request(app)
      .post('/library')
      .send({ title: '' });

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(libraryService.createResource).not.toHaveBeenCalled();
  });

  it('lists resources belonging to the authenticated tutor', async () => {
    const resources = [{ id: 'pending-id', review_status: 'pending' }];
    libraryService.listMyResources.mockResolvedValue(resources);
    const req = {
      user: { id: 'tutor-id', role: 'tutor' },
      query: { category: 'Reading' },
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    await libraryController.listMyResources(req, res, jest.fn());

    expect(libraryService.listMyResources).toHaveBeenCalledWith(
      'tutor-id',
      expect.objectContaining({ category: 'Reading' })
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: resources })
    );
  });
});

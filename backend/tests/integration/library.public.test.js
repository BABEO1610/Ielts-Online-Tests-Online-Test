/**
 * TRACEABILITY MATRIX
 * -------------------
 * Test Case                                  | Requirement ID | Description
 * -------------------------------------------|----------------|------------------------------------------------
 * GET /api/v1/library                        | FR-01          | Guest/Student xem danh sách tài nguyên đã published
 * GET /api/v1/library?resource_type=audio    | FR-02          | Lọc tài nguyên thư viện theo loại (pdf, audio)
 * GET /api/v1/library/:id                    | FR-03          | Xem chi tiết tài nguyên published
 * GET /api/v1/library/:id (unpublished)      | FR-03, L039    | Trả về 404 nếu tài nguyên không tồn tại hoặc chưa published
 */

const request = require('supertest');
const app = require('../../src/app');

// Mock Library Service
const libraryService = require('../../src/services/library.service');
jest.mock('../../src/services/library.service', () => ({
  listResources: jest.fn(),
  getResourceDetail: jest.fn()
}));

// Giả lập AppError class vì chúng ta mock Service ném lỗi
const AppError = require('../../src/utils/AppError');

// Mock DB pool testConnection để tránh app.js cố kết nối DB thật khi load
jest.mock('../../src/db/pool', () => ({
  query: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true)
}));

describe('Integration Test: Public Endpoints for Content Library (L039)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/v1/library', () => {
    it('should return 200 and list only published resources without token', async () => {
      // EARS[Event]: WHEN Guest/Student requests the library list without token...
      const mockResources = [
        {
          id: 'uuid-1',
          title: 'IELTS Cambridge 18',
          description: 'Practice test book',
          resource_type: 'pdf',
          file_size_bytes: 1048576,
          is_published: true,
          created_at: new Date().toISOString()
        }
      ];

      libraryService.listResources.mockResolvedValue(mockResources);

      const response = await request(app).get('/api/v1/library');

      // EARS[State-driven]: THEN it should return HTTP 200 and only published resources
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResources,
        error: null,
        meta: {
          total: 1
        }
      });
      
      // Verify service layer is called with filters
      expect(libraryService.listResources).toHaveBeenCalledWith({
        category: undefined,
        search: undefined,
        resource_type: undefined
      });
    });

    it('should filter resources by resource_type if provided in query', async () => {
      // EARS[Event]: WHEN user requests library with resource_type filter...
      libraryService.listResources.mockResolvedValue([]);

      const response = await request(app).get('/api/v1/library?resource_type=audio');

      // EARS[State-driven]: THEN it should pass the filter down to the service
      expect(response.status).toBe(200);
      expect(libraryService.listResources).toHaveBeenCalledWith({
        category: undefined,
        search: undefined,
        resource_type: 'audio'
      });
    });
  });

  describe('GET /api/v1/library/:id', () => {
    it('should return 200 and resource data if resource is published', async () => {
      // EARS[Event]: WHEN user requests a specific published resource...
      const mockResource = {
        id: 'uuid-1',
        title: 'IELTS Cambridge 18',
        resource_type: 'pdf',
        is_published: true
      };

      libraryService.getResourceDetail.mockResolvedValue(mockResource);

      const response = await request(app).get('/api/v1/library/uuid-1');

      // EARS[State-driven]: THEN it should return HTTP 200 with resource metadata
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockResource,
        error: null,
        meta: null
      });
      expect(libraryService.getResourceDetail).toHaveBeenCalledWith('uuid-1', null);
    });

    it('should return 404 if resource does not exist or is unpublished', async () => {
      // EARS[Unwanted]: IN CASE the requested resource is unpublished or missing...
      libraryService.getResourceDetail.mockRejectedValue(
        new AppError('Tài liệu không tồn tại hoặc đã bị ẩn.', 404, 'LIB_NOT_FOUND')
      );

      const response = await request(app).get('/api/v1/library/uuid-missing');

      // EARS[State-driven]: THEN it should return HTTP 404 with standard error format
      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('LIB_NOT_FOUND');
      expect(response.body.error.message).toBe('Tài liệu không tồn tại hoặc đã bị ẩn.');
    });
  });
});

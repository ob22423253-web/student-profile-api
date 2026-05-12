const swaggerJsdoc = require('swagger-jsdoc');

const definition = {
  openapi: '3.0.0',
  info: {
    title: 'Student Profile API',
    version: '1.0.0',
    description: 'REST API for managing student profiles. Built with Express and MongoDB.'
  },
  servers: [
    { url: '/', description: 'Current host' }
  ],
  components: {
    schemas: {
      Student: {
        type: 'object',
        properties: {
          _id: { type: 'string', example: '64f0a8c7e3a1b2c3d4e5f6a7' },
          firstName: { type: 'string', example: 'Ada' },
          lastName: { type: 'string', example: 'Lovelace' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          age: { type: 'integer', example: 22 },
          course: { type: 'string', example: 'Computer Science' },
          dateRegistered: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        }
      },
      StudentInput: {
        type: 'object',
        required: ['firstName', 'lastName', 'email'],
        properties: {
          firstName: { type: 'string', minLength: 2, maxLength: 50, example: 'Ada' },
          lastName: { type: 'string', minLength: 2, maxLength: 50, example: 'Lovelace' },
          email: { type: 'string', format: 'email', example: 'ada@example.com' },
          age: { type: 'integer', minimum: 0, maximum: 150, example: 22 },
          course: { type: 'string', maxLength: 100, example: 'Computer Science' }
        }
      },
      Pagination: {
        type: 'object',
        properties: {
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 10 },
          total: { type: 'integer', example: 42 },
          totalPages: { type: 'integer', example: 5 }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              message: { type: 'string' },
              statusCode: { type: 'integer' },
              details: { type: 'object' }
            }
          }
        }
      },
      ValidationErrorResponse: {
        type: 'object',
        properties: {
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          200: {
            description: 'API is up',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  uptime: 123.4,
                  timestamp: '2026-05-12T12:00:00.000Z',
                  db: 'connected'
                }
              }
            }
          }
        }
      }
    },
    '/api': {
      get: {
        tags: ['Info'],
        summary: 'API info',
        responses: {
          200: { description: 'API information and links' }
        }
      }
    },
    '/api/students': {
      get: {
        tags: ['Students'],
        summary: 'List students with pagination, search and filter',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 10, maximum: 100 } },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search by firstName, lastName, or email' },
          { name: 'course', in: 'query', schema: { type: 'string' }, description: 'Filter by exact course name' }
        ],
        responses: {
          200: {
            description: 'Paged list of students',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: { type: 'array', items: { $ref: '#/components/schemas/Student' } },
                    pagination: { $ref: '#/components/schemas/Pagination' }
                  }
                }
              }
            }
          }
        }
      },
      post: {
        tags: ['Students'],
        summary: 'Create a student',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/StudentInput' }
            }
          }
        },
        responses: {
          201: {
            description: 'Created',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/Student' } }
            }
          },
          409: {
            description: 'Duplicate email',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } }
            }
          },
          422: {
            description: 'Validation failed',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/ValidationErrorResponse' } }
            }
          }
        }
      }
    },
    '/api/students/stats': {
      get: {
        tags: ['Students'],
        summary: 'Aggregated statistics',
        responses: {
          200: {
            description: 'Counts and breakdowns',
            content: {
              'application/json': {
                example: {
                  total: 42,
                  byCourse: [{ course: 'Computer Science', count: 20 }],
                  recentlyRegistered: 5
                }
              }
            }
          }
        }
      }
    },
    '/api/students/{id}': {
      get: {
        tags: ['Students'],
        summary: 'Get a student by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: { description: 'Found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Student' } } } },
          400: { description: 'Invalid id', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } }
        }
      },
      put: {
        tags: ['Students'],
        summary: 'Update a student',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentInput' } } }
        },
        responses: {
          200: { description: 'Updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Student' } } } },
          400: { description: 'Invalid id' },
          404: { description: 'Not found' },
          409: { description: 'Duplicate email' },
          422: { description: 'Validation failed' }
        }
      },
      delete: {
        tags: ['Students'],
        summary: 'Delete a student',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          200: {
            description: 'Deleted',
            content: {
              'application/json': {
                example: { message: 'Student deleted', id: '64f0a8c7e3a1b2c3d4e5f6a7' }
              }
            }
          },
          400: { description: 'Invalid id' },
          404: { description: 'Not found' }
        }
      }
    }
  }
};

const swaggerSpec = swaggerJsdoc({ definition, apis: [] });

module.exports = swaggerSpec;

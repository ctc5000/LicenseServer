const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'License Server API',
            version: '1.0.0',
            description: 'API для управления модулями и лицензиями',
            contact: {
                name: 'Support',
                email: 'support@example.com'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Development server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT'
                }
            },
            schemas: {
                Module: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        preview_image: { type: 'string' },
                        file_url: { type: 'string' },
                        current_version: { type: 'string' }
                    }
                },
                License: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer' },
                        module_id: { type: 'integer' },
                        license_key: { type: 'string' },
                        is_active: { type: 'boolean' },
                        expires_at: { type: 'string', format: 'date' }
                    }
                },
                LicenseCheckRequest: {
                    type: 'object',
                    required: ['license', 'version'],
                    properties: {
                        license: { type: 'string' },
                        version: { type: 'string', pattern: '^v\\d+\\.\\d+\\.\\d+$' }
                    }
                },
                LicenseCheckResponse: {
                    type: 'object',
                    properties: {
                        scope: { type: 'boolean' },
                        license: { type: 'boolean' },
                        version: { type: 'string', nullable: true },
                        needUpdate: { type: 'boolean' }
                    }
                }
            }
        },
        security: [{ bearerAuth: [] }]
    },
    apis: ['./src/routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;
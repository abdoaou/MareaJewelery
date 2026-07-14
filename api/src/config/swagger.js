import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'
import { env } from '../config/env.js'

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Marea E-Commerce API',
      version: '1.0.0',
      description: 'Production-ready REST API for Marea Jewelry platform',
    },
    servers: [{ url: `/api/${env.apiVersion}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      },
    },
  },
  apis: ['./src/docs/openapi.yaml'],
}

const specs = swaggerJsdoc(options)

export function setupSwagger(app) {
  app.use(`/api/${env.apiVersion}/docs`, swaggerUi.serve, swaggerUi.setup(specs))
  app.get(`/api/${env.apiVersion}/docs.json`, (_req, res) => res.json(specs))
}

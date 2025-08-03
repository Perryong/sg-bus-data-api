require('dotenv').config();

const config = {
  // API Configuration
  apis: {
    lta: {
      baseUrl: 'https://www.lta.gov.sg/map/busService',
      datamall: {
        baseUrl: 'https://datamall2.mytransport.sg/ltaodataservice',
        accountKey: process.env.DatamallAccountKey,
        batchSize: 500
      }
    },
    onemap: {
      baseUrl: 'https://www.onemap.gov.sg',
      sessionUrl: 'https://www.onemap.gov.sg/'
    },
    citymapper: {
      baseUrl: 'https://citymapper.com/api',
      regionId: 'sg-singapore'
    },
    transitlink: {
      baseUrl: 'https://www.transitlink.com.sg/eservice/eguide'
    }
  },

  // File Paths
  paths: {
    raw: './data/v1/raw',
    patch: './data/v1/patch', 
    output: './data/v1',
    services: './data/v1/raw/services'
  },

  // Processing Options
  processing: {
    coordinatePrecision: 5,
    simplifyTolerance: 0.00005,
    requestTimeout: 60000,
    retryLimit: 5,
    requestDelay: 1000
  },

  // Service Types
  serviceTypes: ['CITYDIRECT', 'TRUNK'],

  // Validation Schemas
  schemas: {
    busStop: {
      type: 'object',
      required: ['number', 'name', 'coordinates', 'road'],
      properties: {
        number: { type: 'string', minLength: 1 },
        name: { type: 'string', minLength: 1 },
        coordinates: { 
          type: 'array', 
          items: { type: 'number' },
          minItems: 2,
          maxItems: 2
        },
        road: { type: 'string', minLength: 1 }
      }
    }
  }
};

module.exports = config;
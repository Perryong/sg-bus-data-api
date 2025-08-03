const Validator = require('fastest-validator');

class DataValidator {
  constructor() {
    this.validator = new Validator();
  }

  validate(data, schema) {
    const result = this.validator.validate(data, schema);
    if (result !== true) {
      throw new Error(`Validation failed: ${JSON.stringify(result)}`);
    }
    return true;
  }

  validateBusStop(data) {
    const schema = {
      number: { type: 'string', empty: false },
      name: { type: 'string', empty: false },
      coordinates: {
        type: 'array',
        items: 'number',
        length: 2
      },
      road: { type: 'string', empty: false }
    };
    return this.validate(data, schema);
  }

  validateGeoJSON(data) {
    const schema = {
      type: { type: 'equal', value: 'FeatureCollection' },
      features: {
        type: 'array',
        items: {
          type: 'object',
          props: {
            type: { type: 'equal', value: 'Feature' },
            properties: 'object',
            geometry: 'object'
          }
        }
      }
    };
    return this.validate(data, schema);
  }
}

module.exports = DataValidator;

const EventEmitter = require('events');
const { Logger } = require('../utils');

class BaseService extends EventEmitter {
  constructor(name, options = {}) {
    super();
    this.name = name;
    this.options = options;
    this.logger = new Logger(name);
    this.results = new Map();
    this.errors = [];
  }

  async execute() {
    try {
      this.logger.info(`Starting ${this.name}...`);
      this.emit('start');
      
      const result = await this.run();
      
      this.emit('success', result);
      this.logger.success(`${this.name} completed successfully`);
      return result;
    } catch (error) {
      this.errors.push(error);
      this.emit('error', error);
      this.logger.error(`${this.name} failed:`, error);
      throw error;
    }
  }

  async run() {
    throw new Error('run() method must be implemented by subclass');
  }

  addResult(key, value) {
    this.results.set(key, value);
  }

  getResult(key) {
    return this.results.get(key);
  }

  getAllResults() {
    return Object.fromEntries(this.results);
  }

  hasErrors() {
    return this.errors.length > 0;
  }

  getErrors() {
    return this.errors;
  }
}

module.exports = BaseService;
const got = require('got');
const config = require('../config');

class HttpClient {
  constructor(options = {}) {
    this.defaultOptions = {
      timeout: config.processing.requestTimeout,
      headers: {
        'user-agent': 'sgbusdata/2.0'
      },
      retry: {
        limit: config.processing.retryLimit,
        statusCodes: [...got.defaults.options.retry.statusCodes, 400]
      },
      hooks: {
        beforeRetry: [
          (error, retryCount) => {
            console.log(`🚨 Retrying ${retryCount} time(s) - ${error.url}`);
          }
        ]
      },
      ...options
    };
  }

  async get(url, options = {}) {
    const opts = { 
      ...this.defaultOptions, 
      ...options,
      method: 'GET'
    };
    
    console.log(`🥏 GET ${url}`);
    
    try {
      const response = await got(url, opts);
      return options.returnResponse ? response : response.body;
    } catch (error) {
      console.error(`❌ Failed to fetch ${url}:`, error.message);
      throw error;
    }
  }

  async post(url, body, options = {}) {
    const opts = {
      ...this.defaultOptions,
      ...options,
      method: 'POST',
      body
    };

    console.log(`📤 POST ${url}`);
    
    try {
      const response = await got(url, opts);
      return options.returnResponse ? response : response.body;
    } catch (error) {
      console.error(`❌ Failed to post to ${url}:`, error.message);
      throw error;
    }
  }

  async getJson(url, options = {}) {
    return this.get(url, { 
      ...options, 
      responseType: 'json' 
    });
  }

  async delay(ms = config.processing.requestDelay) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = HttpClient;
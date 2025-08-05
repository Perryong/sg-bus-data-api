// api/lib/http-client.js
const got = require('got');

class HttpClient {
  constructor(baseURL = '', defaultHeaders = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      timeout: 15000,
      retry: {
        limit: 3,
        methods: ['GET']
      },
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      },
      responseType: 'json',
      ...options
    };

    try {
      console.log(`[DEBUG] Making request to: ${url}`);
      const response = await got(url, config);
      return {
        success: true,
        data: response.body,
        status: response.statusCode,
        headers: response.headers
      };
    } catch (error) {
      console.error(`Request failed: ${url}`, error.message);
      return {
        success: false,
        error: error.message,
        status: error.response?.statusCode || 500,
        data: error.response?.body || null
      };
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }
}

module.exports = HttpClient;
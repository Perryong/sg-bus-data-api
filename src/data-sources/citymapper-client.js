const BaseService = require('../core/base-service');
const HttpClient = require('../core/http-client');
const sortKeys = require('sort-keys');
const config = require('../config');

class CityMapperClient extends BaseService {
  constructor() {
    super('CityMapperClient');
    this.httpClient = new HttpClient();
  }

  async searchTransport(query) {
    const url = `${config.apis.citymapper.baseUrl}/2/findtransport?query=${query}&region_id=${config.apis.citymapper.regionId}`;
    const result = await this.httpClient.getJson(url);
    return result.results;
  }

  async getRouteInfo(routeId) {
    const url = `${config.apis.citymapper.baseUrl}/1/routeinfo?route=${routeId}&region_id=${config.apis.citymapper.regionId}&weekend=1&status_format=rich`;
    const routeInfo = await this.httpClient.getJson(url);
    return sortKeys(routeInfo, { deep: true });
  }

  async fetchBusRoute(serviceNumber) {
    const searchResults = await this.searchTransport(serviceNumber);
    
    if (!searchResults?.length) {
      throw new Error(`No results found for service ${serviceNumber}`);
    }

    const firstResult = searchResults.find(r => r.display_name === serviceNumber);
    if (!firstResult) {
      throw new Error(`Exact match not found for service ${serviceNumber}`);
    }

    const routeInfo = await this.getRouteInfo(firstResult.id);
    
    if (!routeInfo.routes.length) {
      throw new Error(`No route data found for service ${serviceNumber}`);
    }

    return routeInfo;
  }
}

module.exports = CityMapperClient;

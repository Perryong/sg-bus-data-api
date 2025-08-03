const BaseService = require('../core/base-service');
const HttpClient = require('../core/http-client');
const config = require('../config');

class OneMapClient extends BaseService {
  constructor() {
    super('OneMapClient');
    this.httpClient = new HttpClient();
    this.token = null;
  }

  async authenticate() {
    if (this.token) return this.token;

    const response = await this.httpClient.get(config.apis.onemap.sessionUrl, {
      returnResponse: true
    });
    
    const cookie = response.headers['set-cookie'][0];
    this.token = cookie.match(/OMITN=(.*?);/)[1];
    
    return this.token;
  }

  async fetchBusRoute(serviceNumber, startBusStop = null) {
    await this.authenticate();
    
    let url = `${config.apis.onemap.baseUrl}/omapp/getBusRoutes?busSvcNo=${serviceNumber}`;
    if (startBusStop) {
      url += `&startBusStopNo=${startBusStop}`;
    }

    return this.httpClient.getJson(url, {
      headers: { Cookie: `OMITN=${this.token}` }
    });
  }

  async fetchBusDirections(serviceNumber, routeData) {
    const direction1 = await this.fetchBusRoute(serviceNumber, routeData[0].stops[0]);
    
    let direction2 = null;
    if (routeData[1]) {
      direction2 = await this.fetchBusRoute(serviceNumber, routeData[1].stops[0]);
    }

    const diff = direction2?.[0]?.START_BUS_STOP_NUM !== direction1?.[0]?.START_BUS_STOP_NUM;
    
    return {
      BUS_DIRECTION_ONE: direction1 || direction2,
      BUS_DIRECTION_TWO: diff ? direction2 : null
    };
  }
}

module.exports = OneMapClient;
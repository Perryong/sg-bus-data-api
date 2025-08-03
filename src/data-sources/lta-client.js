const BaseService = require('../core/base-service');
const HttpClient = require('../core/http-client');
const { Parsers } = require('../utils');
const config = require('../config');

class LTAClient extends BaseService {
  constructor() {
    super('LTAClient');
    this.httpClient = new HttpClient();
  }

  async fetchBusStops() {
    const url = `${config.apis.lta.baseUrl}/bus_stops.xml`;
    const xmlData = await this.httpClient.get(url);
    const parsed = Parsers.parseXML(xmlData);
    return parsed.busstops.busstop;
  }

  async fetchBusServices() {
    const url = `${config.apis.lta.baseUrl}/bus_services.xml`;
    const xmlData = await this.httpClient.get(url);
    const parsed = Parsers.parseXML(xmlData, {
      arrayMode: /^file$/i
    });

    const busServices = [];
    Object.entries(parsed.bus_service_list).forEach(([type, value]) => {
      const services = value.bus_service.map(s => {
        const { kmlFile, routeFile, ...props } = s;
        return {
          ...props,
          type,
          kmlFile: kmlFile.file,
          routeFile: routeFile.file
        };
      });
      busServices.push(...services);
    });

    return busServices;
  }

  async fetchServiceRoute(type, fileName) {
    const url = `${config.apis.lta.baseUrl}/bus_route_xml/${fileName}`;
    const xmlData = await this.httpClient.get(url);
    const parsed = Parsers.parseXML(xmlData, {
      arrayMode: /^direction$/i
    });

    const { direction } = parsed.route;
    return direction.map(d => {
      const { name, busstop } = d;
      return { 
        name, 
        stops: busstop?.map(s => s.name) || [] 
      };
    });
  }

  async fetchServiceGeometry(type, fileName) {
    const togeojson = require('@tmcw/togeojson');
    const url = `${config.apis.lta.baseUrl}/bus_route_kml/${fileName}`;
    const kmlData = await this.httpClient.get(url);
    const kml = Parsers.parseDOM(kmlData);
    return togeojson.kml(kml);
  }

  async fetchDatamallData(endpoint, options = {}) {
    const { batchSize = config.apis.lta.datamall.batchSize } = options;
    const values = [];
    let skip = 0;
    let data;

    do {
      const url = `${config.apis.lta.datamall.baseUrl}/${endpoint}?$skip=${skip}`;
      data = await this.httpClient.getJson(url, {
        headers: {
          AccountKey: config.apis.lta.datamall.accountKey
        }
      });
      
      values.push(...data.value);
      skip += batchSize;
    } while (data.value.length > 0);

    return values;
  }

  async fetchBusStopsDatamall() {
    return this.fetchDatamallData('BusStops');
  }

  async fetchBusRoutesDatamall() {
    return this.fetchDatamallData('BusRoutes');
  }
}

module.exports = LTAClient;
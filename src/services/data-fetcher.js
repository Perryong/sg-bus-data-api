const BaseService = require('../core/base-service');
const DataManager = require('../core/data-manager');
const LTAClient = require('../data-sources/lta-client');
const config = require('../config');
const path = require('path');

class DataFetcher extends BaseService {
  constructor() {
    super('DataFetcher');
    this.dataManager = new DataManager();
    this.ltaClient = new LTAClient();
  }

  async run() {
    // Fetch basic data
    await this.fetchBusStops();
    await this.fetchBusServices();
    await this.fetchDatamallData();
    await this.fetchServiceRoutes();
    
    return this.getAllResults();
  }

  async fetchBusStops() {
    this.logger.info('Fetching bus stops...');
    const stops = await this.ltaClient.fetchBusStops();
    const filePath = path.join(config.paths.raw, 'bus-stops.json');
    this.dataManager.write(filePath, stops);
    this.addResult('bus-stops', stops);
  }

  async fetchBusServices() {
    this.logger.info('Fetching bus services...');
    const services = await this.ltaClient.fetchBusServices();
    const filePath = path.join(config.paths.raw, 'bus-services.json');
    this.dataManager.write(filePath, services);
    this.addResult('bus-services', services);
  }

  async fetchDatamallData() {
    this.logger.info('Fetching DataMall data...');
    
    // Bus stops from DataMall
    const busStops = await this.ltaClient.fetchBusStopsDatamall();
    this.dataManager.write(
      path.join(config.paths.raw, 'bus-stops.datamall.json'), 
      busStops
    );
    
    // Bus routes from DataMall  
    const busRoutes = await this.ltaClient.fetchBusRoutesDatamall();
    this.dataManager.write(
      path.join(config.paths.raw, 'bus-routes.datamall.json'), 
      busRoutes
    );

    this.addResult('bus-stops-datamall', busStops);
    this.addResult('bus-routes-datamall', busRoutes);
  }

  async fetchServiceRoutes() {
    this.logger.info('Fetching service routes...');
    
    const services = this.getResult('bus-services');
    const failedXMLs = [];
    const failedKMLs = [];

    for (const service of services) {
      const { number, type, kmlFile, routeFile } = service;

      if (/^-/.test(number) || !config.serviceTypes.includes(type)) {
        this.logger.info(`Skipping ${number} (${type})`);
        continue;
      }

      // Fetch XML routes
      for (const fileName of routeFile) {
        try {
          const route = await this.ltaClient.fetchServiceRoute(type, fileName);
          const outputPath = path.join(
            config.paths.services, 
            type, 
            `${path.parse(fileName).name}.json`
          );
          this.dataManager.write(outputPath, route);
        } catch (error) {
          failedXMLs.push({ fileName, error: error.message });
        }
      }

      // Fetch KML geometries  
      for (const fileName of kmlFile) {
        try {
          const geojson = await this.ltaClient.fetchServiceGeometry(type, fileName);
          const outputPath = path.join(
            config.paths.services,
            type,
            `${path.parse(fileName).name}.geojson`
          );
          this.dataManager.write(outputPath, geojson);
        } catch (error) {
          failedKMLs.push({ fileName, error: error.message });
        }
      }

      // Rate limiting
      await this.ltaClient.httpClient.delay();
    }

    // Save failures for patching
    if (failedXMLs.length || failedKMLs.length) {
      this.dataManager.write(
        path.join(config.paths.patch, 'bus-services-routes.failures.json'),
        { failedXMLs, failedKMLs }
      );
    }

    this.addResult('failed-xmls', failedXMLs);
    this.addResult('failed-kmls', failedKMLs);
  }
}

module.exports = DataFetcher;
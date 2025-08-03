const BaseService = require('../core/base-service');
const DataManager = require('../core/data-manager');
const OneMapClient = require('../data-sources/onemap-client');
const CityMapperClient = require('../data-sources/citymapper-client');
const FormData = require('form-data');
const HttpClient = require('../core/http-client');
const config = require('../config');
const path = require('path');

class DataPatcher extends BaseService {
  constructor() {
    super('DataPatcher');
    this.dataManager = new DataManager();
    this.oneMapClient = new OneMapClient();
    this.cityMapperClient = new CityMapperClient();
    this.httpClient = new HttpClient();
  }

  async run() {
    await this.patchMissingRoutes();
    await this.patchMultilineRoutes();
    await this.patchBusStopNames();
    
    return this.getAllResults();
  }

  async patchMissingRoutes() {
    this.logger.info('Patching missing routes...');
    
    const failures = this.dataManager.read(
      path.join(config.paths.patch, 'bus-services-routes.failures.json')
    );
    
    const services = this.dataManager.read(
      path.join(config.paths.raw, 'bus-services.json')
    );

    // Process failed KMLs exactly like original
    const missingServices = failures.failedKMLs.map((d) => {
      const [_, serviceNumber, pattern] = d.fileName.match(/^([\w-]+)\-(\d)\./i);
      const service = services.find((s) => s.number == serviceNumber);
      
      try {
        const serviceData = this.dataManager.read(
          path.join(config.paths.services, service.type, `${serviceNumber}.json`)
        );
        const pat = Number(pattern);
        
        if (serviceData[pat - 1]) {
          return [serviceNumber, pat, serviceData];
        } else {
          // Patterns
          console.warn(`Missing pattern ${pat} for service ${serviceNumber}`);
        }
      } catch (e) {
        console.error(e);
        console.warn(`Failed to read service data for service ${serviceNumber}`);
      }
    });

    // Get OneMap session token (NEW API)
    const res = await this.httpClient.get('https://www.onemap.gov.sg/', {
      returnResponse: true
    });
    const cookie = res.headers['set-cookie'][0];
    const token = cookie.match(/OMITN=(.*?);/)[1];

    const srslyMissingServices = [];

    for (let i = 0; i < missingServices.length; i++) {
      const missingService = missingServices[i];
      if (!missingService) continue;
      
      const [number, _pat, data] = missingService;
      
      try {
        // Try OneMap first - using NEW API endpoints
        const direction1 = await this.httpClient.getJson(
          `https://www.onemap.gov.sg/omapp/getBusRoutes?busSvcNo=${number}&startBusStopNo=${data[0].stops[0]}`,
          { headers: { Cookie: `OMITN=${token}` } }
        );
        
        const direction2 = data[1]
          ? await this.httpClient.getJson(
              `https://www.onemap.gov.sg/omapp/getBusRoutes?busSvcNo=${number}&startBusStopNo=${data[1].stops[0]}`,
              { headers: { Cookie: `OMITN=${token}` } }
            )
          : null;
        
        const diff = direction2?.[0]?.START_BUS_STOP_NUM !== direction1?.[0]?.START_BUS_STOP_NUM;
        
        const directions = {
          BUS_DIRECTION_ONE: direction1 || direction2,
          BUS_DIRECTION_TWO: diff ? direction2 : null,
        };
        
        if (directions.BUS_DIRECTION_ONE) {
          const firstBusStop = directions.BUS_DIRECTION_ONE[0].START_BUS_STOP_NUM;
          const dataFirstBusStop = data[0].stops[0];
          
          if (dataFirstBusStop !== firstBusStop) {
            console.log(`⚠️⚠️⚠️ For ${number}, there's a bus stop mismatch! ${dataFirstBusStop} != ${firstBusStop}`);
          } else {
            this.dataManager.write(
              path.join(config.paths.patch, `${number}.om.json`),
              directions
            );
            continue;
          }
        }
      } catch (e) {
        console.error(e);
      }

      // Fallback to CityMapper
      console.log(`⛔️ Bus service ${number} is missing. Falling back to CityMapper`);
      
      try {
        const { results } = await this.httpClient.getJson(
          `https://citymapper.com/api/2/findtransport?query=${number}&region_id=sg-singapore`
        );
        
        if (results?.length) {
          const firstResult = results.find((r) => r.display_name == number);
          
          if (firstResult) {
            const routeInfo = await this.httpClient.getJson(
              `https://citymapper.com/api/1/routeinfo?route=${firstResult.id}&region_id=sg-singapore&weekend=1&status_format=rich`
            );
            
            if (routeInfo.routes.length) {
              const sortKeys = require('sort-keys');
              this.dataManager.write(
                path.join(config.paths.patch, `${number}.cm.json`),
                sortKeys(routeInfo, { deep: true })
              );
              continue;
            }
          }
        }
        
        console.log(`⛔️ Bus service ${number} is also missing on CityMapper!`);
        srslyMissingServices.push(number);
      } catch (error) {
        console.log(`⛔️ Bus service ${number} is also missing on CityMapper!`);
        srslyMissingServices.push(number);
      }
    }

    this.dataManager.write(
      path.join(config.paths.patch, 'missing-services.json'),
      srslyMissingServices
    );
    
    this.addResult('missing-services', srslyMissingServices);
  }

  async patchMultilineRoutes() {
    this.logger.info('Patching multiline routes...');
    
    const services = this.dataManager.read(
      path.join(config.paths.raw, 'bus-services.json')
    );
    
    // First, identify multiline services exactly like original
    const multilineGeoJSONs = [];

    services.forEach((service) => {
      const { number, type, kmlFile } = service;
      if (/^-/.test(number) || !config.serviceTypes.includes(type)) return;

      kmlFile.forEach((fileName) => {
        try {
          const numberPattern = path.parse(fileName).name;
          const geojson = this.dataManager.read(
            path.join(config.paths.services, type, `${numberPattern}.geojson`)
          );

          // Check for multiple features
          const { features } = geojson;
          if (features.length > 1) {
            const allFeaturesSame = features.every(
              (f) =>
                f.geometry.coordinates.join() ===
                features[0].geometry.coordinates.join(),
            );
            console.log(`🤪 Service ${number} features are all the same 🤦‍♂️`);
            if (allFeaturesSame) return;
            
            multilineGeoJSONs.push({
              number,
              numberPattern,
              e: 'More than 1 feature',
              count: features.length,
            });
            return;
          }

          const { geometry } = features[0];

          // Check for multiple *connected* LineStrings
          if (
            geometry.type === 'GeometryCollection' &&
            geometry.geometries.every((g) => g.type === 'LineString')
          ) {
            const isConnected = geometry.geometries.every(
              (geometry, index, geometries) => {
                // Ignore last geometry - just return true
                return (
                  index === geometries.length - 1 ||
                  geometry.coordinates[geometry.coordinates.length - 1].join(',') === 
                  geometries[index + 1].coordinates[0].join(',')
                );
              },
            );
            if (isConnected) {
              return;
            }
          }

          // For anything else, just reject them
          if (geometry.type !== 'LineString') {
            multilineGeoJSONs.push({
              number,
              numberPattern,
              e: `Not LineString but is ${geometry.type}`,
              count:
                geometry.type === 'GeometryCollection'
                  ? geometry.geometries.length
                  : '?',
            });
            return;
          }
        } catch (e) {
          // File doesn't exist, skip
        }
      });
    });

    console.table(multilineGeoJSONs);
    this.dataManager.write(
      path.join(config.paths.patch, 'patch-multiple-routes.results.json'),
      multilineGeoJSONs
    );

    // Now patch using OneMap - exactly like original
    const res = await this.httpClient.get('https://www.onemap.gov.sg/', {
      returnResponse: true
    });
    const cookie = res.headers['set-cookie'][0];
    const token = cookie.match(/OMITN=(.*?);/)[1];

    const multilineServices = [...new Set(multilineGeoJSONs.map((g) => '' + g.number))];
    
    for (let i = 0; i < multilineServices.length; i++) {
      const number = multilineServices[i];
      
      try {
        // Fetch direction 1
        const direction1 = await this.httpClient.getJson(
          `https://www.onemap.gov.sg/omapp/getBusRoutes?busSvcNo=${number}`,
          { headers: { Cookie: `OMITN=${token}` } }
        );
        
        let direction2 = null;
        if (direction1.length) {
          const END_BUS_STOP_NUM = direction1[0].END_BUS_STOP_NUM;
          if (END_BUS_STOP_NUM) {
            direction2 = await this.httpClient.getJson(
              `https://www.onemap.gov.sg/omapp/getBusRoutes?busSvcNo=${number}&startBusStopNo=${END_BUS_STOP_NUM}`,
              { headers: { Cookie: `OMITN=${token}` } }
            );
          }
        }
        
        const diff = direction2?.[0]?.START_BUS_STOP_NUM !== direction1?.[0]?.START_BUS_STOP_NUM;
        
        const directions = {
          BUS_DIRECTION_ONE: direction1 || direction2,
          BUS_DIRECTION_TWO: diff ? direction2 : null,
        };
        
        if (directions.BUS_DIRECTION_ONE) {
          this.dataManager.write(
            path.join(config.paths.patch, `${number}.om.json`),
            directions
          );
        } else {
          console.warn(`Bus service ${number} is missing`);
        }
      } catch (error) {
        this.logger.error(`Failed to patch multiline route for ${number}:`, error.message);
      }

      await this.httpClient.delay();
    }

    this.addResult('multiline-services', multilineServices);
  }

  async patchBusStopNames() {
    this.logger.info('Patching bus stop names...');
    
    const stops = this.dataManager.read(
      path.join(config.paths.raw, 'bus-stops.json')
    );
    
    const faultyStopNames = [];
    const legitStops = stops.filter((s) => !/^-/.test(s.name));

    for (let i = 0; i < legitStops.length; i++) {
      const stop = legitStops[i];
      const { name: number, details: name } = stop;
      
      if (!/[a-z]/.test(name) && /[A-Z]{2,}/.test(name)) {
        try {
          const form = new FormData();
          form.append('bs_code', '-');
          form.append('bscode', number);
          
          console.log(`🚏 ${number}`); // Match original log format
          
          const html = await this.httpClient.post(
            'https://www.transitlink.com.sg/eservice/eguide/bscode_idx.php',
            form
          );
          
          const match = html.match(
            /<td class="data">[^<>]+<\/td>[\s\n\r\t]+<td class="data">([^<>]+)/i
          );
          
          const newName = match ? match[1] : null;
          faultyStopNames.push({ number, name, newName });
          
          // Wait a second - exactly like original
          await new Promise((res) => setTimeout(res, 1000));
        } catch (error) {
          this.logger.error(`Failed to patch stop name for ${number}:`, error.message);
        }
      }
    }

    console.table(faultyStopNames); // Match original output
    this.dataManager.write(
      path.join(config.paths.patch, 'bus-stop-names.json'),
      faultyStopNames
    );
    
    this.addResult('patched-stop-names', faultyStopNames);
  }
}

module.exports = DataPatcher;
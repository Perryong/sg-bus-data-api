const BaseService = require('../core/base-service');
const DataManager = require('../core/data-manager');
const { DataValidator, Parsers } = require('../utils');
const polyline = require('@mapbox/polyline');
const simplify = require('simplify-js');
const { round } = require('@turf/helpers');
const config = require('../config');
const path = require('path');

class DataGenerator extends BaseService {
  constructor() {
    super('DataGenerator');
    this.dataManager = new DataManager();
    this.validator = new DataValidator();
  }

  async run() {
    await this.generateMainData();
    await this.generateFirstLastData();
    return this.getAllResults();
  }

  async generateMainData() {
    this.logger.info('Generating main data files...');
    
    // Load source data
    const sourceData = this.loadSourceData();
    
    // Process data
    const processedData = this.processData(sourceData);
    
    // Generate outputs
    await this.generateOutputs(processedData);
    
    this.addResult('processed-data', processedData);
  }

  loadSourceData() {
    return {
      stops: this.dataManager.read(path.join(config.paths.raw, 'bus-stops.json')),
      stopsDatamall: this.dataManager.read(path.join(config.paths.raw, 'bus-stops.datamall.json')),
      services: this.dataManager.read(path.join(config.paths.raw, 'bus-services.json')),
      stopNames: this.loadStopNames(),
      missingServices: this.loadMissingServices(),
      faultyRoutes: this.identifyFaultyRoutes()
    };
  }

  loadStopNames() {
    try {
      const stopNamesArr = this.dataManager.read(
        path.join(config.paths.patch, 'bus-stop-names.json')
      );
      return stopNamesArr.reduce((acc, s) => {
        acc[s.number] = s.newName;
        return acc;
      }, {});
    } catch (error) {
      return {};
    }
  }

  loadMissingServices() {
    try {
      return this.dataManager.read(
        path.join(config.paths.patch, 'missing-services.json')
      );
    } catch (error) {
      return [];
    }
  }

  identifyFaultyRoutes() {
    const faultyRoutes = [];
    
    try {
      const failures = this.dataManager.read(
        path.join(config.paths.patch, 'bus-services-routes.failures.json')
      );
      faultyRoutes.push(
        ...failures.failedKMLs.map(d => 
          path.parse(d.fileName).name.replace(/-\d+$/, '')
        )
      );
    } catch (error) {
      // No failures file exists
    }

    try {
      const multilineResults = this.dataManager.read(
        path.join(config.paths.patch, 'patch-multiple-routes.results.json')
      );
      faultyRoutes.push(
        ...multilineResults.map(d => String(d.number))
      );
    } catch (error) {
      // No multiline results file exists
    }

    return faultyRoutes;
  }

  processData(sourceData) {
    const { stops, stopsDatamall, services, stopNames, missingServices, faultyRoutes } = sourceData;
    
    // Process stops
    const processedStops = this.processStops(stops, stopsDatamall, stopNames);
    
    // Process services
    const processedServices = this.processServices(
      services, 
      processedStops.stopsData, 
      missingServices, 
      faultyRoutes
    );

    return {
      stops: processedStops,
      services: processedServices
    };
  }

  processStops(stops, stopsDatamall, stopNames) {
    const stopsJSON = {};
    const stopsData = {};
    const stopsServices = {};
    
    // Create road name lookup
    const roadLookup = stopsDatamall.reduce((acc, s) => {
      acc[s.BusStopCode] = s.RoadName;
      return acc;
    }, {});

    stops
      .filter(s => !/^-/.test(s.name))
      .sort((a, b) => String(a.name).localeCompare(String(b.name)))
      .forEach(s => {
        const { name, details, coordinates: { long, lat } } = s;
        const number = String(name);
        const stopName = stopNames[number] || details;
        const road = roadLookup[number] || 'Unknown Road';

        const coordinates = [
          round(long, config.processing.coordinatePrecision),
          round(lat, config.processing.coordinatePrecision)
        ];

        stopsJSON[number] = [...coordinates, stopName, road];
        stopsData[number] = {
          number,
          name: stopName,
          road,
          coordinates: [long, lat]
        };
      });

    return { stopsJSON, stopsData, stopsServices };
  }

  processServices(services, stopsData, missingServices, faultyRoutes) {
    const servicesJSON = {};
    const routesPolylines = {};
    const routesFeatures = [];

    services
      .filter(s => 
        !/^-/.test(s.number) &&
        config.serviceTypes.includes(s.type) &&
        !missingServices.includes(s.number)
      )
      .sort((a, b) => String(a.number).localeCompare(String(b.number)))
      .forEach(service => {
        const processed = this.processService(service, stopsData, faultyRoutes);
        
        if (processed) {
          const { number, serviceData, polylines, features } = processed;
          servicesJSON[number] = serviceData;
          routesPolylines[number] = polylines;
          routesFeatures.push(...features);
        }
      });

    routesFeatures.sort((a, b) => {
      const numCompare = a.properties.number.localeCompare(b.properties.number);
      return numCompare !== 0 ? numCompare : a.properties.pattern - b.properties.pattern;
    });

    return { servicesJSON, routesPolylines, routesFeatures };
  }

  processService(service, stopsData, faultyRoutes) {
    const { number, type, kmlFile } = service;
    const num = String(number);

    try {
      // Load route data
      const route = this.dataManager.read(
        path.join(config.paths.services, type, `${number}.json`)
      ).filter(pattern => pattern.stops && pattern.stops.length > 0);

      // Filter valid stops and create routes
      const stopsRoutes = route.map(r =>
        r.stops.filter(s => stopsData[s])
      );

      // Generate service name
      const serviceName = this.generateServiceName(stopsRoutes, stopsData);

      // Process geometries
      const { polylines, features } = this.processServiceGeometries(
        num, type, kmlFile, route, faultyRoutes
      );

      return {
        number: num,
        serviceData: {
          name: serviceName,
          routes: stopsRoutes
        },
        polylines,
        features
      };
    } catch (error) {
      this.logger.error(`Failed to process service ${number}:`, error.message);
      return null;
    }
  }

  generateServiceName(routes, stopsData) {
    if (routes.length === 1) {
      const route = routes[0];
      const [firstStop, ...rest] = route;
      const lastStop = rest[rest.length - 1];
      
      if (firstStop === lastStop) {
        const midStop = rest[Math.floor((rest.length - 1) / 2)];
        return `${stopsData[firstStop].name} ⟲ ${stopsData[midStop].name}`;
      } else {
        return `${stopsData[firstStop].name} → ${stopsData[lastStop].name}`;
      }
    } else {
      const [route1, route2] = routes;
      const firstStops = route1[0] === route2[route2.length - 1]
        ? [route1[0]]
        : [route1[0], route2[route2.length - 1]];
      const lastStops = route2[0] === route1[route1.length - 1]
        ? [route1[route1.length - 1]]
        : [route1[route1.length - 1], route2[0]];
      
      const firstStopsName = firstStops.map(s => stopsData[s].name).join(' / ');
      const lastStopsName = lastStops.map(s => stopsData[s].name).join(' / ');
      
      return firstStopsName === lastStopsName 
        ? firstStopsName
        : `${firstStopsName} ⇄ ${lastStopsName}`;
    }
  }

  processServiceGeometries(serviceNumber, type, kmlFiles, route, faultyRoutes) {
    const polylines = [];
    const features = [];

    if (faultyRoutes.includes(serviceNumber)) {
      return this.processPatchedGeometries(serviceNumber, route, polylines, features);
    }

    kmlFiles.forEach((fileName, i) => {
      try {
        const pattern = path.parse(fileName).name;
        const geojson = this.dataManager.read(
          path.join(config.paths.services, type, `${pattern}.geojson`)
        );

        const coordinates = this.extractCoordinatesFromFeature(geojson.features[0]);
        polylines[i] = this.coordsToPolyline(coordinates);
        
        features.push({
          type: 'Feature',
          properties: {
            number: serviceNumber,
            pattern: i
          },
          geometry: {
            type: 'LineString',
            coordinates
          }
        });
      } catch (error) {
        this.logger.warn(`Failed to process geometry for ${serviceNumber} pattern ${i}`);
      }
    });

    return { polylines, features };
  }

  processPatchedGeometries(serviceNumber, route, polylines, features) {
    const patchPatterns = this.loadPatchPatterns(serviceNumber);
    
    if (!patchPatterns) {
      return { polylines, features };
    }

    route.forEach((pattern, i) => {
      const matchingPattern = patchPatterns.find(p => p.firstStop === pattern.stops[0]);
      
      if (matchingPattern) {
        const coordinates = matchingPattern.coordinates;
        polylines[i] = this.coordsToPolyline(coordinates);
        
        features.push({
          type: 'Feature',
          properties: {
            number: serviceNumber,
            pattern: i
          },
          geometry: {
            type: 'LineString',
            coordinates
          }
        });
      }
    });

    return { polylines, features };
  }

  loadPatchPatterns(serviceNumber) {
    try {
      // Try OneMap patch first
      const patchRoute = this.dataManager.read(
        path.join(config.paths.patch, `${serviceNumber}.om.json`)
      );
      
      const patterns = [];
      const { BUS_DIRECTION_ONE, BUS_DIRECTION_TWO } = patchRoute;
      
      if (BUS_DIRECTION_ONE) {
        const firstStop = BUS_DIRECTION_ONE.find(s => s.BUS_SEQUENCE === 1).START_BUS_STOP_NUM;
        const coordinates = BUS_DIRECTION_ONE.reduce((acc, v) => {
          const line = v.GEOMETRIES;
          if (acc.length && acc[acc.length - 1].join() === line[0].join()) {
            line.shift();
          }
          acc.push(...line);
          return acc;
        }, []);
        patterns.push({ firstStop, coordinates });
      }
      
      if (BUS_DIRECTION_TWO) {
        const firstStop = BUS_DIRECTION_TWO.find(s => s.BUS_SEQUENCE === 1).START_BUS_STOP_NUM;
        const coordinates = BUS_DIRECTION_TWO.reduce((acc, v) => {
          const line = v.GEOMETRIES;
          if (acc.length && acc[acc.length - 1].join() === line[0].join()) {
            line.shift();
          }
          acc.push(...line);
          return acc;
        }, []);
        patterns.push({ firstStop, coordinates });
      }
      
      return patterns;
    } catch (error) {
      try {
        // Fallback to CityMapper patch
        const patchRoute = this.dataManager.read(
          path.join(config.paths.patch, `${serviceNumber}.cm.json`)
        );
        
        return patchRoute.routes[0].patterns.map(p => ({
          firstStop: patchRoute.stops[p.stop_points[0].id].stop_code,
          coordinates: p.path.map(coords => coords.reverse())
        }));
      } catch (error) {
        return null;
      }
    }
  }

  extractCoordinatesFromFeature(feature) {
    if (feature.geometry.type === 'GeometryCollection') {
      return feature.geometry.geometries.reduce((acc, g) => {
        const line = g.coordinates;
        if (acc.length && acc[acc.length - 1].join() === line[0].join()) {
          line.shift();
        }
        acc.push(...line);
        return acc;
      }, []);
    } else if (feature.geometry.type === 'LineString') {
      return feature.geometry.coordinates;
    } else {
      throw new Error(`Unsupported geometry type: ${feature.geometry.type}`);
    }
  }

  coordsToPolyline(coords) {
    const xyCoords = coords.map(coord => ({ x: coord[0], y: coord[1] }));
    const simplified = simplify(xyCoords, config.processing.simplifyTolerance, true);
    return polyline.encode(simplified.map(coord => [coord.y, coord.x]));
  }

  async generateOutputs(processedData) {
    const { stops, services } = processedData;
    
    // Generate GeoJSON files
    await this.generateGeoJSONFiles(stops, services);
    
    // Generate JSON files
    await this.generateJSONFiles(stops, services);
  }

  async generateGeoJSONFiles(stops, services) {
    // Stops GeoJSON
    const stopsFeatures = Object.values(stops.stopsData)
      .filter(d => stops.stopsServices[d.number])
      .map(d => ({
        type: 'Feature',
        id: d.number,
        properties: {
          number: d.number,
          name: d.name,
          road: d.road,
          services: [...stops.stopsServices[d.number]].sort()
        },
        geometry: {
          type: 'Point',
          coordinates: d.coordinates
        }
      }));

    const stopsGeoJSON = {
      type: 'FeatureCollection',
      features: stopsFeatures
    };

    this.validator.validateGeoJSON(stopsGeoJSON);
    
    this.dataManager.write(
      path.join(config.paths.output, 'stops.geojson'),
      stopsGeoJSON
    );
    this.dataManager.write(
      path.join(config.paths.output, 'stops.min.geojson'),
      stopsGeoJSON,
      { minified: true }
    );

    // Routes GeoJSON
    const routesGeoJSON = {
      type: 'FeatureCollection',
      features: services.routesFeatures
    };

    this.validator.validateGeoJSON(routesGeoJSON);
    
    this.dataManager.write(
      path.join(config.paths.output, 'routes.geojson'),
      routesGeoJSON
    );
    this.dataManager.write(
      path.join(config.paths.output, 'routes.min.geojson'),
      routesGeoJSON,
      { minified: true }
    );
  }

  async generateJSONFiles(stops, services) {
    // Stops JSON
    this.dataManager.write(
      path.join(config.paths.output, 'stops.json'),
      stops.stopsJSON
    );
    this.dataManager.write(
      path.join(config.paths.output, 'stops.min.json'),
      stops.stopsJSON,
      { minified: true }
    );

    // Services JSON
    this.dataManager.write(
      path.join(config.paths.output, 'services.json'),
      services.servicesJSON
    );
    this.dataManager.write(
      path.join(config.paths.output, 'services.min.json'),
      services.servicesJSON,
      { minified: true }
    );

    // Routes JSON (polylines)
    this.dataManager.write(
      path.join(config.paths.output, 'routes.json'),
      services.routesPolylines
    );
    this.dataManager.write(
      path.join(config.paths.output, 'routes.min.json'),
      services.routesPolylines,
      { minified: true }
    );
  }

  async generateFirstLastData() {
    this.logger.info('Generating first/last timing data...');
    
    const busStops = this.dataManager.read(
      path.join(config.paths.raw, 'bus-stops.json')
    ).filter(s => !/^-/.test(s.name)).map(s => s.name);
    
    const busRoutes = this.dataManager.read(
      path.join(config.paths.raw, 'bus-routes.datamall.json')
    );

    const firstLastJSON = {};
    
    busRoutes.forEach(route => {
      const {
        ServiceNo,
        BusStopCode,
        WD_FirstBus,
        WD_LastBus,
        SAT_FirstBus,
        SAT_LastBus,
        SUN_FirstBus,
        SUN_LastBus
      } = route;

      if (!busStops.includes(BusStopCode)) {
        this.logger.warn(`Service ${ServiceNo} excluded - stop ${BusStopCode} not found`);
        return;
      }

      const satFirst = SAT_FirstBus !== '-' && SAT_FirstBus === WD_FirstBus ? '=' : SAT_FirstBus;
      const satLast = SAT_LastBus !== '-' && SAT_LastBus === WD_LastBus ? '=' : SAT_LastBus;
      const sunFirst = SUN_FirstBus !== '-' && SUN_FirstBus === WD_FirstBus ? '=' : SUN_FirstBus;
      const sunLast = SUN_LastBus !== '-' && SUN_LastBus === WD_LastBus ? '=' : SUN_LastBus;

      if (!firstLastJSON[BusStopCode]) firstLastJSON[BusStopCode] = [];
      firstLastJSON[BusStopCode].push(
        `${ServiceNo} ${WD_FirstBus} ${WD_LastBus} ${satFirst} ${satLast} ${sunFirst} ${sunLast}`
      );
    });

    this.dataManager.write(
      path.join(config.paths.output, 'firstlast.json'),
      firstLastJSON
    );
    this.dataManager.write(
      path.join(config.paths.output, 'firstlast.min.json'),
      firstLastJSON,
      { minified: true }
    );

    this.addResult('first-last-data', firstLastJSON);
  }
}

module.exports = DataGenerator;
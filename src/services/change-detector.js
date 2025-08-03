const BaseService = require('../core/base-service');
const DataManager = require('../core/data-manager');
const { diff } = require('just-diff');
const hyperdiff = require('hyperdiff');
const { execSync } = require('child_process');
const config = require('../config');
const path = require('path');

class ChangeDetector extends BaseService {
  constructor() {
    super('ChangeDetector');
    this.dataManager = new DataManager();
  }

  async run() {
    const changes = {
      date: this.getCurrentDate(),
      stops: await this.detectStopsChanges(),
      services: await this.detectServicesChanges(),
      routes: await this.detectRoutesChanges(),
      firstLast: await this.detectFirstLastChanges()
    };

    const hasChanges = this.hasAnyChanges(changes);
    
    if (!hasChanges) {
      throw new Error('No changes detected in any data files!');
    }

    this.logChanges(changes);
    return changes;
  }

  getCurrentDate() {
    return new Date().toLocaleDateString('en-SG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  readOldNewData(relativePath) {
    const oldData = JSON.parse(
      execSync(`git show $(git branch --show-current):${relativePath}`, {
        encoding: 'utf8'
      })
    );
    const newData = this.dataManager.read(relativePath);
    return [oldData, newData];
  }

  async detectStopsChanges() {
    const [oldStops, newStops] = this.readOldNewData('data/v1/stops.json');
    const stopsDiff = diff(oldStops, newStops);
    
    const changes = {
      countChange: {
        old: Object.keys(oldStops).length,
        new: Object.keys(newStops).length
      },
      added: this.extractStopChanges(stopsDiff, 'add', newStops),
      removed: this.extractStopChanges(stopsDiff, 'remove', oldStops),
      nameChanged: this.extractStopNameChanges(stopsDiff, oldStops),
      locationChanged: this.extractStopLocationChanges(stopsDiff, oldStops, newStops)
    };

    return changes;
  }

  extractStopChanges(diff, operation, stopsData) {
    return diff
      .filter(d => d.op === operation)
      .map(d => ({
        number: d.path[0],
        name: operation === 'add' ? d.value[2] : stopsData[d.path[0]][2]
      }));
  }

  extractStopNameChanges(diff, oldStops) {
    return diff
      .filter(d => d.op === 'replace' && d.path[1] === 2)
      .map(d => ({
        number: d.path[0],
        oldName: oldStops[d.path[0]][d.path[1]],
        newName: d.value
      }));
  }

  extractStopLocationChanges(diff, oldStops, newStops) {
    const locationChanges = diff.filter(d => d.op === 'replace' && d.path[1] !== 2);
    const processedNumbers = new Set();
    
    return locationChanges
      .filter(d => {
        const number = d.path[0];
        if (processedNumbers.has(number)) return false;
        processedNumbers.add(number);
        return true;
      })
      .map(d => {
        const number = d.path[0];
        return {
          number,
          oldCoordinates: [oldStops[number][0], oldStops[number][1]],
          newCoordinates: [newStops[number][0], newStops[number][1]]
        };
      });
  }

  async detectServicesChanges() {
    const [oldServices, newServices] = this.readOldNewData('data/v1/services.json');
    const servicesDiff = diff(oldServices, newServices);
    
    const changes = {
      countChange: {
        old: Object.keys(oldServices).length,
        new: Object.keys(newServices).length
      },
      added: this.extractServiceChanges(servicesDiff, 'add', newServices),
      removed: this.extractServiceChanges(servicesDiff, 'remove', oldServices),
      routeChanges: this.extractRouteChanges(servicesDiff, oldServices, newServices)
    };

    return changes;
  }

  extractServiceChanges(diff, operation, servicesData) {
    return diff
      .filter(d => d.op === operation && d.path[1] !== 'routes')
      .map(d => ({
        number: d.path[0],
        name: operation === 'add' ? d.value.name : servicesData[d.path[0]].name
      }));
  }

  extractRouteChanges(diff, oldServices, newServices) {
    const routeChanges = diff.filter(d => d.path[1] === 'routes');
    const changedServices = new Set(routeChanges.map(d => d.path[0]));
    
    return Array.from(changedServices).map(serviceNumber => {
      const oldRoutes = oldServices[serviceNumber].routes;
      const newRoutes = newServices[serviceNumber].routes;
      const { added, removed } = hyperdiff(oldRoutes.flat(), newRoutes.flat());
      
      return {
        number: serviceNumber,
        name: newServices[serviceNumber].name,
        added: added.length,
        removed: removed.length
      };
    });
  }

  async detectRoutesChanges() {
    const [oldRoutes, newRoutes] = this.readOldNewData('data/v1/routes.json');
    const routesDiff = diff(oldRoutes, newRoutes);
    
    const newServices = this.dataManager.read('data/v1/services.json');
    const changedServices = [...new Set(routesDiff.map(d => d.path[0]))]
      .filter(s => newServices[s])
      .map(serviceNumber => ({
        number: serviceNumber,
        name: newServices[serviceNumber].name
      }));

    return { changedServices };
  }

  async detectFirstLastChanges() {
    const [oldFL, newFL] = this.readOldNewData('data/v1/firstlast.json');
    const flDiff = diff(this.rewriteFirstLast(oldFL), this.rewriteFirstLast(newFL));
    
    return {
      hasChanges: flDiff.length > 0,
      affectedServices: flDiff.map(fl => fl.path[0])
    };
  }

  rewriteFirstLast(fl) {
    const newFL = {};
    Object.entries(fl).forEach(([_, serviceTimings]) => {
      serviceTimings.forEach(serviceTiming => {
        const [service, ...timing] = serviceTiming.split(' ');
        if (!newFL[service]) newFL[service] = '';
        newFL[service] += timing.join('');
      });
    });
    return newFL;
  }

  hasAnyChanges(changes) {
    return (
      changes.stops.added.length > 0 ||
      changes.stops.removed.length > 0 ||
      changes.stops.nameChanged.length > 0 ||
      changes.stops.locationChanged.length > 0 ||
      changes.services.added.length > 0 ||
      changes.services.removed.length > 0 ||
      changes.services.routeChanges.length > 0 ||
      changes.routes.changedServices.length > 0 ||
      changes.firstLast.hasChanges
    );
  }

  logChanges(changes) {
    console.log(`\n# ${changes.date}`);
    
    // Log stops changes
    if (changes.stops.countChange.old !== changes.stops.countChange.new) {
      console.log(`\n## Stops count change: ${changes.stops.countChange.old} ⮕ ${changes.stops.countChange.new}`);
    }
    
    if (changes.stops.added.length > 0) {
      console.log(`\n### Stops added: ${changes.stops.added.length}\n`);
      changes.stops.added.forEach(stop => {
        console.log(`- \`${stop.number}\` ${stop.name}`);
      });
    }
    
    if (changes.stops.removed.length > 0) {
      console.log(`\n### Stops removed: ${changes.stops.removed.length}\n`);
      changes.stops.removed.forEach(stop => {
        console.log(`- \`${stop.number}\` ${stop.name}`);
      });
    }
    
    if (changes.stops.nameChanged.length > 0) {
      console.log(`\n### Stop names changed: ${changes.stops.nameChanged.length}\n`);
      changes.stops.nameChanged.forEach(stop => {
        console.log(`- \`${stop.number}\` ${stop.oldName} ⮕ ${stop.newName}`);
      });
    }
    
    if (changes.stops.locationChanged.length > 0) {
      console.log(`\n### Stop locations changed: ${changes.stops.locationChanged.length}\n`);
      changes.stops.locationChanged.forEach(stop => {
        console.log(`- \`${stop.number}\` ${stop.oldCoordinates.join(',')} ⮕ ${stop.newCoordinates.join(',')}`);
      });
    }

    // Log services changes
    if (changes.services.countChange.old !== changes.services.countChange.new) {
      console.log(`\n## Services count change: ${changes.services.countChange.old} ⮕ ${changes.services.countChange.new}`);
    }
    
    if (changes.services.added.length > 0) {
      console.log(`\n### Services added: ${changes.services.added.length}\n`);
      changes.services.added.forEach(service => {
        console.log(`- \`${service.number}\` ${service.name}`);
      });
    }
    
    if (changes.services.removed.length > 0) {
      console.log(`\n### Services removed: ${changes.services.removed.length}\n`);
      changes.services.removed.forEach(service => {
        console.log(`- \`${service.number}\` ${service.name}`);
      });
    }
    
    if (changes.services.routeChanges.length > 0) {
      console.log(`\n### Bus Stop Changes To Routes: ${changes.services.routeChanges.length}\n`);
      changes.services.routeChanges.forEach(service => {
        const addedText = service.added ? `+${service.added}` : '';
        const removedText = service.removed ? `-${service.removed}` : '';
        const separator = addedText && removedText ? ', ' : '';
        console.log(`- \`${service.number}\` ${service.name}: ${addedText}${separator}${removedText}`);
      });
    }

    // Log routes changes
    if (changes.routes.changedServices.length > 0) {
      console.log(`\n## Routes changed: ${changes.routes.changedServices.length}\n`);
      changes.routes.changedServices.forEach(service => {
        console.log(`- \`${service.number}\` ${service.name}`);
      });
    }

    // Log first/last changes
    if (changes.firstLast.hasChanges) {
      console.log(`\n## First/last timings changed\n`);
      console.log(`Affected services: ${changes.firstLast.affectedServices.map(s => `\`${s}\``).join(', ')}`);
    }
  }
}

module.exports = ChangeDetector;
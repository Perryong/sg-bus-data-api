const parser = require('fast-xml-parser');
const he = require('he');
const { DOMParser } = require('xmldom');

class Parsers {
  static parseXML(xml, options = {}) {
    const defaultOptions = {
      attributeNamePrefix: '',
      ignoreAttributes: false,
      parseAttributeValue: false,
      ignoreNameSpace: true,
      allowBooleanAttributes: true,
      attrValueProcessor: (val, attrName) =>
        he.decode(val, { isAttributeValue: true }),
      tagValueProcessor: (val, tagName) => he.decode(val),
    };

    return parser.parse(xml, { ...defaultOptions, ...options });
  }

  static parseDOM(str) {
    return new DOMParser().parseFromString(str);
  }

  static parseCoordinates(coordString, precision = 5) {
    const coords = coordString.split(',').map(Number);
    return coords.map(coord => Math.round(coord * Math.pow(10, precision)) / Math.pow(10, precision));
  }
}

module.exports = Parsers;
# Singapore Bus API Usage Guide

This guide provides detailed information on how to use the Singapore Bus Data API. The API offers real-time bus information, bus stops, routes, and services data for Singapore's public transportation system.

**Base URL:** `https://sg-bus-data-api.vercel.app/api`

## Table of Contents

- [API Overview](#api-overview)
- [Authentication](#authentication)
- [Endpoints](#endpoints)
  - [API Info](#api-info)
  - [Health Check](#health-check)
  - [Bus Stops](#bus-stops)
  - [Bus Services](#bus-services)
  - [Bus Routes](#bus-routes)
  - [Real-time Arrivals](#real-time-arrivals)
  - [Real-time Bus Locations](#real-time-bus-locations)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Examples](#examples)
  - [Finding Bus Stops Near Me](#finding-bus-stops-near-me)
  - [Checking Bus Arrivals](#checking-bus-arrivals)
  - [Getting Route Information](#getting-route-information)

## API Overview

The Singapore Bus API provides access to:

- Static data (bus stops, services, routes)
- Real-time data (bus arrivals, bus locations)

Data is returned in JSON format with consistent response structures.

## Authentication

**Real-time endpoints require authentication:**
- The `/arrivals` and `/realtime` endpoints require a valid LTA DataMall API key
- The API key must be configured as an environment variable `DatamallAccountKey`
- Without a valid API key, these endpoints will return a 500 error with "DataMall API key not configured"

**Static data endpoints do not require authentication:**
- `/bus-stops`, `/bus-services`, `/bus-routes`, `/health`, and `/` endpoints work without API keys

## Endpoints

### API Info

Get general information about the API.

```
GET /
```

Example: `https://sg-bus-data-api.vercel.app/api`

Response:
```json
{
  "success": true,
  "data": {
    "name": "SG Bus API",
    "version": "2.0.0",
    "status": "online",
    "description": "Singapore Bus Data API with real-time information",
    "endpoints": [
      {
        "path": "/api/health",
        "method": "GET",
        "description": "Health check endpoint"
      },
      ...
    ],
    "documentation": "https://github.com/Perryong/sg-bus-data-api",
    "source": "https://github.com/Perryong/sg-bus-data-api"
  },
  "timestamp": "2025-08-05T08:30:15.429Z"
}
```

### Health Check

Check the API's health status.

```
GET /health
```

Example: `https://sg-bus-data-api.vercel.app/api/health`

Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "2.0.0",
    "timestamp": "2025-08-05T08:30:45.123Z",
    "uptime": 1234567,
    "memory": {
      "rss": 50331648,
      "heapTotal": 33554432,
      "heapUsed": 20971520,
      "external": 1048576
    },
    "environment": "production"
  },
  "timestamp": "2025-08-05T08:30:45.124Z"
}
```

### Bus Stops

Get information about bus stops with optional filtering.

```
GET /bus-stops
```

Parameters:
- `bbox` (optional): Bounding box in format "lng1,lat1,lng2,lat2" (must be 4 comma-separated numbers)
- `service` (optional): Filter by bus service number (1-3 alphanumeric characters, optionally followed by a letter)
- `search` (optional): Search by bus stop name or road
- `limit` (optional): Maximum number of results (default: 100, max: 1000)
- `format` (optional): Response format, either "json" (default) or "geojson"

Example: `https://sg-bus-data-api.vercel.app/api/bus-stops?search=sengkang&limit=5`

Response (JSON format):
```json
{
  "success": true,
  "data": {
    "stops": {
      "65011": {
        "code": "65011",
        "name": "Sengkang Int",
        "road": "Sengkang Sq",
        "coordinates": [103.8954, 1.3917],
        "services": ["27", "43", "83", "119", "156", "371", "372", "965"]
      },
      ...
    }
  },
  "timestamp": "2025-08-05T08:31:22.583Z",
  "meta": {
    "total": 5,
    "service": null,
    "search": "sengkang",
    "limit": 5
  }
}
```

Example (GeoJSON format): `https://sg-bus-data-api.vercel.app/api/bus-stops?search=sengkang&limit=5&format=geojson`

### Bus Services

Get information about bus services with optional filtering.

```
GET /bus-services
```

Parameters:
- `search` (optional): Search by service number or name
- `origin` (optional): Filter by origin bus stop code (5-digit number)
- `destination` (optional): Filter by destination bus stop code (5-digit number)
- `limit` (optional): Maximum number of results (default: 100, max: 100)

Example: `https://sg-bus-data-api.vercel.app/api/bus-services?search=27`

Response:
```json
{
  "success": true,
  "data": {
    "services": {
      "27": {
        "number": "27",
        "name": "Hougang Central - Tampines",
        "operator": "SBST",
        "category": "Trunk",
        "routes": [
          ["65009", "65019", "65021", ... ],
          ["65021", "65019", "65009", ... ]
        ],
        "loopType": "Bi-directional"
      }
    }
  },
  "timestamp": "2025-08-05T08:32:45.123Z",
  "meta": {
    "total": 1,
    "search": "27",
    "origin": null,
    "destination": null,
    "limit": 100
  }
}
```

### Bus Routes

Get bus route information with optional filtering.

```
GET /bus-routes
```

Parameters:
- `service` (optional): Filter by service number (1-3 alphanumeric characters, optionally followed by a letter)
- `bbox` (optional): Bounding box in format "lng1,lat1,lng2,lat2" (must be 4 comma-separated numbers)
- `simplified` (optional): Use simplified routes (default: "true")
- `format` (optional): Response format, either "json" (default) or "geojson"

Example: `https://sg-bus-data-api.vercel.app/api/bus-routes?service=27`

Response (JSON format):
```json
{
  "success": true,
  "data": {
    "routes": {
      "27": {
        "polylines": [
          "qqgRcx_zRhA_AtBwB...",
          "gpfRqz~yRcBvB..."
        ],
        "stops": [
          ["65009", "65019", ...],
          ["65021", "65019", ...]
        ]
      }
    }
  },
  "timestamp": "2025-08-05T08:33:15.583Z",
  "meta": {
    "total": 1,
    "service": "27",
    "format": "polylines",
    "simplified": true
  }
}
```

Example (GeoJSON format): `https://sg-bus-data-api.vercel.app/api/bus-routes?service=27&format=geojson`

### Real-time Arrivals

Get real-time bus arrival information.

**⚠️ Requires DataMall API key**

```
GET /arrivals
```

Parameters:
- `busStopCode` (required): 5-digit bus stop code
- `serviceNo` (optional): Filter by service number (1-3 alphanumeric characters, optionally followed by a letter)

Example: `https://sg-bus-data-api.vercel.app/api/arrivals?busStopCode=65011`

Response:
```json
{
  "success": true,
  "data": {
    "busStopCode": "65011",
    "arrivals": [
      {
        "serviceNo": "27",
        "operator": "SBST",
        "buses": [
          {
            "estimatedArrival": "2025-08-05T08:40:22+08:00",
            "minutesAway": 5,
            "load": "SEA",
            "feature": "WAB",
            "type": "SD",
            "monitored": true,
            "visitNumber": "1",
            "originCode": "65009",
            "destinationCode": "65009",
            "latitude": 1.3925627,
            "longitude": 103.8956742
          },
          {
            "estimatedArrival": "2025-08-05T08:52:15+08:00",
            "minutesAway": 17,
            "load": "SDA",
            "feature": "WAB",
            "type": "DD",
            "monitored": true,
            "visitNumber": "1",
            "originCode": "65009",
            "destinationCode": "65009",
            "latitude": 1.3843561,
            "longitude": 103.8911837
          }
        ]
      },
      ...
    ]
  },
  "timestamp": "2025-08-05T08:35:23.429Z",
  "meta": {
    "total": 8,
    "serviceFilter": null
  }
}
```

Example with service filter: `https://sg-bus-data-api.vercel.app/api/arrivals?busStopCode=65011&serviceNo=27`

### Real-time Bus Locations

Get real-time bus location information.

**⚠️ Requires DataMall API key**

```
GET /realtime
```

Parameters:
- `serviceNo` (optional): Filter by service number (1-3 alphanumeric characters, optionally followed by a letter)
- `skip` (optional): Number of records to skip (default: 0, must be non-negative integer)

Example: `https://sg-bus-data-api.vercel.app/api/realtime?serviceNo=27`

Response:
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "serviceNo": "27",
        "busId": "10234",
        "operator": "SBST",
        "coordinates": [103.8956742, 1.3925627],
        "bearing": 45.2,
        "timestamp": "2025-08-05T08:34:22+08:00",
        "congestion": "Low",
        "busType": "SD"
      },
      ...
    ]
  },
  "timestamp": "2025-08-05T08:35:00.123Z",
  "meta": {
    "total": 15,
    "serviceFilter": "27",
    "skip": 0,
    "source": "LTA DataMall BusLocationv2"
  }
}
```

## Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2025-08-05T08:35:00.123Z",
  "meta": { ... }
}
```

- `success`: Boolean indicating if the request was successful
- `data`: The requested data
- `timestamp`: ISO 8601 timestamp of when the response was generated
- `meta`: Additional metadata about the response (varies by endpoint)

## Error Handling

When an error occurs, the API returns:

```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Error message",
    "details": { ... }
  },
  "timestamp": "2025-08-05T08:35:30.456Z"
}
```

Common error codes:
- `400`: Bad Request - Invalid parameters
- `404`: Not Found - Resource not found
- `429`: Too Many Requests - Rate limit exceeded
- `500`: Internal Server Error - Server-side error (including missing DataMall API key)
- `503`: Service Unavailable - Temporary service issue

### Specific Error Scenarios

**Missing DataMall API Key:**
```json
{
  "success": false,
  "error": {
    "code": 500,
    "message": "DataMall API key not configured"
  }
}
```

**Invalid Bus Stop Code:**
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Invalid bus stop code. It should be a 5-digit number"
  }
}
```

**LTA API Errors:**
```json
{
  "success": false,
  "error": {
    "code": 503,
    "message": "Unable to fetch arrival data from LTA",
    "details": {
      "suggestion": "Try a different bus stop code such as 65011 (Sengkang Int) or 01012 (Dhoby Ghaut)"
    }
  }
}
```

## Examples

### Finding Bus Stops Near Me

To find bus stops near your location (e.g., in Sengkang):

1. Search for bus stops:
   ```
   https://sg-bus-data-api.vercel.app/api/bus-stops?search=sengkang&limit=10
   ```

2. Get bus stops in a geographic area (using bounding box):
   ```
   https://sg-bus-data-api.vercel.app/api/bus-stops?bbox=103.89,1.38,103.90,1.40&format=geojson
   ```

### Checking Bus Arrivals

To check bus arrivals:

1. Get all arrivals at Sengkang Interchange:
   ```
   https://sg-bus-data-api.vercel.app/api/arrivals?busStopCode=65011
   ```

2. Check arrivals for a specific service:
   ```
   https://sg-bus-data-api.vercel.app/api/arrivals?busStopCode=65011&serviceNo=27
   ```

### Getting Route Information

To get bus route information:

1. Find service details:
   ```
   https://sg-bus-data-api.vercel.app/api/bus-services?search=27
   ```

2. Get route polylines for mapping:
   ```
   https://sg-bus-data-api.vercel.app/api/bus-routes?service=27&format=geojson
   ```

3. Find services between two stops:
   ```
   https://sg-bus-data-api.vercel.app/api/bus-services?origin=65011&destination=77009
   ```

## Development and Deployment

### Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/Perryong/sg-bus-data-api.git
   cd sg-bus-data-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   # Create .env file
   echo "DatamallAccountKey=your_api_key_here" > .env
   ```

4. Run development server:
   ```bash
   npm run vercel:dev
   ```

### Deployment

The API is deployed on Vercel and automatically builds from the main branch. The `vercel.json` configuration routes all API requests to the appropriate endpoint files.

---

For more information, visit the [project repository](https://github.com/Perryong/sg-bus-data-api) or check the API base endpoint at `https://sg-bus-data-api.vercel.app/api`.

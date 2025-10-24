import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

/**
 * API Documentation Generator
 * Generates comprehensive API documentation with service-type specific endpoints
 */
export class ApiDocsGenerator extends BaseGenerator {
  /**
   * Generate API documentation
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated API docs file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    // Ensure docs directory exists
    const docsDir = join(servicePath, 'docs');
    mkdirSync(docsDir, { recursive: true });

    const apiDocsContent = this._generateApiDocsContent(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, 'docs', 'API.md');
    writeFileSync(filePath, apiDocsContent, 'utf8');
    return filePath;
  }

  /**
   * Generate API documentation content
   * @private
   */
  _generateApiDocsContent(coreInputs, confirmedValues) {
    return `# ${confirmedValues.displayName} API Documentation

## Overview

${confirmedValues.description}

**Base URL**: ${confirmedValues.productionUrl}
**API Base Path**: ${confirmedValues.apiBasePath}
**Version**: ${confirmedValues.version}

## Authentication

${confirmedValues.features.authentication ?
'This service requires authentication. Include your API key in the request headers:\n\n' +
'```\nAuthorization: Bearer YOUR_API_KEY\n```' :
'This service does not require authentication.'}

## Endpoints

### Health Check

**GET** ${confirmedValues.healthCheckPath}

Check the health status of the service.

**Response:**
\`\`\`json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "${coreInputs.serviceName}",
  "version": "${confirmedValues.version}",
  "environment": "${coreInputs.environment}",
  "checks": [
    {
      "name": "database",
      "status": "healthy"
    },
    {
      "name": "configuration",
      "status": "healthy"
    }
  ]
}
\`\`\`

### API Endpoints

**Base Path**: ${confirmedValues.apiBasePath}

${this._generateApiEndpointsForType(coreInputs.serviceType, coreInputs, confirmedValues)}

## Error Responses

All error responses follow this format:

\`\`\`json
{
  "success": false,
  "error": "Error message",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
\`\`\`

### Common HTTP Status Codes

- **200**: Success
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

## Rate Limiting

${confirmedValues.features.rateLimiting ?
'This service implements rate limiting. Please respect the following limits:\n\n' +
'- 1000 requests per hour for authenticated users\n' +
'- 100 requests per hour for anonymous users' :
'This service does not implement rate limiting.'}

## Data Formats

All requests and responses use JSON format.

### Request Headers

\`\`\`
Content-Type: application/json
Authorization: Bearer YOUR_API_KEY (if required)
\`\`\`

### Response Headers

\`\`\`
Content-Type: application/json
X-Service: ${coreInputs.serviceName}
X-Version: ${confirmedValues.version}
X-Response-Time: 150
\`\`\`
`;
  }

  /**
   * Generate service-type specific API endpoints documentation
   * @private
   */
  _generateApiEndpointsForType(serviceType, coreInputs, confirmedValues) {
    const endpoints = {
      'data-service': `
#### List Items
**GET** /items

Retrieve a paginated list of items.

**Query Parameters:**
- \`limit\` (optional): Number of items per page (default: 20, max: 100)
- \`offset\` (optional): Number of items to skip (default: 0)
- \`search\` (optional): Search query string
- \`filters\` (optional): JSON object with filter criteria

**Response:**
\`\`\`json
{
  "success": true,
  "data": [...],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 150,
    "hasMore": true
  }
}
\`\`\`

#### Create Item
**POST** /items

Create a new item.

**Request Body:**
\`\`\`json
{
  "name": "Item Name",
  "description": "Item description",
  "data": {}
}
\`\`\`

#### Get Item
**GET** /items/{id}

Retrieve a specific item by ID.

#### Update Item
**PUT** /items/{id}

Update an existing item.

#### Delete Item
**DELETE** /items/{id}

Delete an item.
`,
      'auth-service': `
#### Register User
**POST** /auth/register

Register a new user account.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password"
}
\`\`\`

#### Login
**POST** /auth/login

Authenticate a user and receive access tokens.

**Request Body:**
\`\`\`json
{
  "email": "user@example.com",
  "password": "password"
}
\`\`\`

#### Get Profile
**GET** /auth/profile

Get the current user's profile information.

#### Update Profile
**PUT** /auth/profile

Update the current user's profile.

#### Logout
**POST** /auth/logout

Invalidate the current user's session.
`,
      'content-service': `
#### List Content
**GET** /content

Retrieve a list of content items.

#### Create Content
**POST** /content

Create new content.

**Request Body:**
\`\`\`json
{
  "title": "Content Title",
  "content": "Content body",
  "contentType": "article",
  "tags": ["tag1", "tag2"]
}
\`\`\`

#### Get Content
**GET** /content/{id}

Retrieve specific content by ID.

#### Update Content
**PUT** /content/{id}

Update existing content.

#### Delete Content
**DELETE** /content/{id}

Delete content.

#### Upload Media
**POST** /media/upload

Upload media files.
`,
      'api-gateway': `
#### Route Request
**ANY** /*

All requests are routed through the API gateway.

**Headers:**
- \`X-Target-Service\`: Target service name
- \`X-Target-Path\`: Path on target service

#### Get Routes
**GET** /routes

List all configured routes.

#### Health Status
**GET** /status

Get gateway health and route status.
`,
      'generic': `
#### Service Info
**GET** /info

Get service information and capabilities.

**Response:**
\`\`\`json
{
  "success": true,
  "data": {
    "name": "${coreInputs.serviceName}",
    "type": "${coreInputs.serviceType}",
    "version": "${confirmedValues.version}",
    "features": ${JSON.stringify(Object.keys(confirmedValues.features).filter(key => confirmedValues.features[key]), null, 4)}
  }
}
\`\`\`
`
    };

    return endpoints[serviceType] || endpoints.generic;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate API documentation
  }
}

import { BaseGenerator } from '../BaseGenerator.js';
import { join } from 'path';
import { writeFileSync } from 'fs';

/**
 * Docker Compose Generator
 * Generates docker-compose.yml for local development environment
 */
export class DockerComposeGenerator extends BaseGenerator {
  /**
   * Generate docker-compose.yml file
   * @param {Object} context - Generation context
   * @returns {Promise<string>} Path to generated docker-compose.yml file
   */
  async generate(context) {
    const { coreInputs, confirmedValues, servicePath } = this.extractContext(context);
    
    if (!this.shouldGenerate(context)) {
      return null;
    }

    const dockerComposeContent = this._generateDockerComposeContent(coreInputs, confirmedValues);
    
    const filePath = join(servicePath, 'docker-compose.yml');
    writeFileSync(filePath, dockerComposeContent, 'utf8');
    return filePath;
  }

  /**
   * Generate docker-compose.yml content
   * @private
   */
  _generateDockerComposeContent(coreInputs, confirmedValues) {
    return `version: '3.8'

services:
  ${coreInputs.serviceName}:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=development
      - SERVICE_NAME=${coreInputs.serviceName}
      - SERVICE_TYPE=${coreInputs.serviceType}
      - ENVIRONMENT=development
    volumes:
      - .:/app
      - /app/node_modules
    command: npm run dev

  ${coreInputs.serviceName}-db:
    image: cloudflare/d1
    ports:
      - "8788:8787"
    environment:
      - DATABASE_NAME=${confirmedValues.databaseName}
    volumes:
      - .wrangler:/data
`;
  }

  /**
   * Determine if generator should run
   */
  shouldGenerate(context) {
    return true; // Always generate docker-compose.yml
  }
}

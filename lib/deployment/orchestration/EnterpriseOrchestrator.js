/**
 * Enterprise Orchestrator - STUB
 *
 * This is a stub implementation for the basic clodo-framework package.
 * Enterprise features are only available in the enterprise package.
 *
 * To use enterprise deployment features, please install the enterprise package:
 * npm install @tamyla/clodo-framework-enterprise
 */

import { BaseDeploymentOrchestrator } from './BaseDeploymentOrchestrator.js';

export class EnterpriseOrchestrator extends BaseDeploymentOrchestrator {
  /**
   * Constructor for enterprise orchestrator - STUB
   * @throws {Error} Enterprise features not available in basic package
   */
  constructor(options = {}) {
    super(options);

    throw new Error(
      'Enterprise deployment features are not available in the basic clodo-framework package.\n' +
      'To use enterprise deployment capabilities (multi-region, high-availability, compliance, etc.),\n' +
      'please install the enterprise package: npm install @tamyla/clodo-framework-enterprise'
    );
  }
}
#!/usr/bin/env node

/**
 * Assessment Engine Demonstration
 * Shows how the intelligent assessment works on the current framework codebase
 */

console.log('🚀 Script starting...');

import { CapabilityAssessmentEngine } from '../src/service-management/CapabilityAssessmentEngine.js';

async function demonstrateAssessment() {
  console.log('🚀 Clodo Framework - Intelligent Assessment Demonstration');
  console.log('=' .repeat(60));

  // Set mock API token with limited permissions for demonstration
  process.env.CLOUDFLARE_API_TOKEN = 'limited_token';

  const assessor = new CapabilityAssessmentEngine();

  try {
    console.log('\n📊 Running comprehensive capability assessment...\n');

    // Run full assessment
    const assessment = await assessor.assessCapabilities();

    // Display results
    console.log('🎯 ASSESSMENT RESULTS');
    console.log('-'.repeat(40));

    console.log(`Service Type: ${assessment.mergedInputs.serviceType || 'Not determined'}`);
    console.log(`Assessment Confidence: ${assessment.confidence}%`);
    console.log(`Service Maturity: ${assessment.discovery.assessment.maturity}`);
    console.log(`Configuration Completeness: ${assessment.discovery.assessment.completeness}%`);

    console.log('\n🔍 DISCOVERED CAPABILITIES');
    console.log('-'.repeat(40));

    const capabilities = assessment.discovery.capabilities;
    Object.entries(capabilities).forEach(([type, config]) => {
      const status = config.configured ? '✅' : '❌';
      const details = config.configured ?
        `(Provider: ${config.provider || 'unknown'})` : '';
      console.log(`${status} ${type}: ${config.configured} ${details}`);
    });

    console.log('\n� API TOKEN ANALYSIS');
    console.log('-'.repeat(40));

    const apiToken = assessment.discovery.artifacts.apiToken;
    if (apiToken && apiToken.available) {
      console.log(`Token Available: ✅`);
      console.log(`Permissions Found: ${apiToken.permissions.length}`);
      console.log(`Deployable Capabilities:`);

      const deployableCaps = apiToken.capabilities;
      Object.entries(deployableCaps).forEach(([type, config]) => {
        const status = config.possible ? '✅ Possible' : '❌ Not Possible';
        console.log(`  - ${type}: ${status}`);
      });
    } else {
      console.log(`Token Available: ❌`);
      console.log(`Note: Limited deployment capabilities without API token`);
    }

    console.log('\n�📋 CAPABILITY MANIFEST');
    console.log('-'.repeat(40));

    const manifest = assessment.capabilityManifest;
    console.log(`Required Capabilities: ${manifest.requiredCapabilities.join(', ')}`);
    console.log(`Optional Capabilities: ${manifest.optionalCapabilities.join(', ')}`);
    console.log(`Infrastructure: ${manifest.infrastructure.join(', ')}`);

    console.log('\n⚠️  GAP ANALYSIS');
    console.log('-'.repeat(40));

    const gaps = assessment.gapAnalysis;
    if (gaps.missing.length > 0) {
      console.log('Missing Capabilities:');
      gaps.missing.forEach(gap => {
        const deployable = gap.deployable !== false ? '' : ' (cannot deploy - permissions)';
        console.log(`  - ${gap.capability} (${gap.priority} priority)${deployable}`);
      });
    } else {
      console.log('✅ No missing capabilities detected');
    }

    if (gaps.partiallyConfigured.length > 0) {
      console.log('\nPartially Configured:');
      gaps.partiallyConfigured.forEach(gap => {
        console.log(`  - ${gap.capability} (${gap.priority} priority)`);
      });
    }

    console.log('\n💡 RECOMMENDATIONS');
    console.log('-'.repeat(40));

    if (assessment.recommendations.length > 0) {
      assessment.recommendations.slice(0, 5).forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.reason}`);
        console.log(`   Action: ${rec.action}`);
        console.log(`   Effort: ${rec.effort}`);
        console.log('');
      });
    } else {
      console.log('✅ No recommendations - service appears well configured');
    }

    console.log('\n🎯 NEXT STEPS');
    console.log('-'.repeat(40));

    const nextSteps = assessor.generateNextSteps(assessment);
    nextSteps.forEach((step, index) => {
      console.log(`${index + 1}. ${step}`);
    });

    console.log('\n✨ ASSESSMENT COMPLETE');
    console.log('=' .repeat(60));

    // Export for potential persistence
    const exportData = assessor.exportForPersistence(assessment);
    console.log(`Assessment ID: ${exportData.id}`);
    console.log(`Ready for persistence in DataBridge`);

  } catch (error) {
    console.error('❌ Assessment failed:', error.message);
    console.error(error.stack);
  }
}

// Run demonstration
demonstrateAssessment();

export { demonstrateAssessment };
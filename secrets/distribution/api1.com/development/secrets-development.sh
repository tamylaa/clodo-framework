#!/bin/bash
# Wrangler secret deployment for api1.com (development)
# Generated: 2025-10-28T09:30:39.566Z

echo "be01b7a016063162b1c2b66f745d24118194992312688f3e1ff91870950358c0" | npx wrangler secret put AUTH_JWT_SECRET --env development
echo "bb1a3067c8bc5a4418d968b3052a4c98f4a6dc8d1e3d5ea0d23375ea51f76e95" | npx wrangler secret put X_SERVICE_KEY --env development
echo "69b996be5d330e46502f35b8064ae837fc334076d714b7ba" | npx wrangler secret put AUTH_SERVICE_API_KEY --env development
echo "d9c464b9cd92c776afeddfc41c18de534afd7219f67ca4e2" | npx wrangler secret put LOGGER_SERVICE_API_KEY --env development
echo "f3ff528a281391bd90baa55a5642fa945468bf22d4e87c74" | npx wrangler secret put CONTENT_SKIMMER_API_KEY --env development
echo "0c54dc7dac74af66f3386ccf20be7bc58a0a86f0cd413153428d32a52aced30a" | npx wrangler secret put CROSS_DOMAIN_AUTH_KEY --env development
echo "ae7a18fc8c212b3aefdf5b126e9aa3fb" | npx wrangler secret put WEBHOOK_SIGNATURE_KEY --env development
echo "7548313a7cf20a0b4dfc916ed313bc487e393f4fbf5d50a3e21752cd0badbf06" | npx wrangler secret put FILE_ENCRYPTION_KEY --env development
echo "420f57de0d8debbd0da239bda7ed2f15698ee1ac402a1371" | npx wrangler secret put SESSION_ENCRYPTION_KEY --env development
echo "228cd1af232b3aeca9c6cfd8bc1535d1" | npx wrangler secret put API_RATE_LIMIT_KEY --env development
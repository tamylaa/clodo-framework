#!/bin/bash
# Wrangler secret deployment for clodo.dev (development)
# Generated: 2025-10-25T12:00:53.333Z

echo "e8fae03363652d725851660cc005c11f603e85387b958f40e8f58bb8d7c64f15" | npx wrangler secret put AUTH_JWT_SECRET --env development
echo "2e3b5f53f392823cb88661e7f1abc5a83cb17d3c1c5fa3f2fc117f7710110e5a" | npx wrangler secret put X_SERVICE_KEY --env development
echo "ab671ae5393e17e801aa4c7bae0bb4ea50db77ec54b65726" | npx wrangler secret put AUTH_SERVICE_API_KEY --env development
echo "f58aec90565d8e94fe862c8ac4d8a85198358c19ffad1a34" | npx wrangler secret put LOGGER_SERVICE_API_KEY --env development
echo "53f86b1fb5af963a14c42b7513999ef069b53a4629320aad" | npx wrangler secret put CONTENT_SKIMMER_API_KEY --env development
echo "311e4a4b175f895fbcc0752dbc705dbfb18af6fde002e28c5774302ba843a02f" | npx wrangler secret put CROSS_DOMAIN_AUTH_KEY --env development
echo "f51dff785143ed0e1aa41f6111d49f87" | npx wrangler secret put WEBHOOK_SIGNATURE_KEY --env development
echo "c5e1b817bac410535ed32a8b43bba2107a19523d8790df232e008487357f263e" | npx wrangler secret put FILE_ENCRYPTION_KEY --env development
echo "fb2cb128968ada5fe097607723a3be4e095a7a93d7f38662" | npx wrangler secret put SESSION_ENCRYPTION_KEY --env development
echo "e950638526b0208d6a1d47c21a7bfb5d" | npx wrangler secret put API_RATE_LIMIT_KEY --env development
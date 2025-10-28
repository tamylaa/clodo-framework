#!/bin/bash
# Wrangler secret deployment for api2.com (development)
# Generated: 2025-10-28T09:30:39.947Z

echo "835e129e3335258a32331517cec5fef2f33eea97bd3f71de7db82f7363f79e9d" | npx wrangler secret put AUTH_JWT_SECRET --env development
echo "576047f0fe1a0cca929059903796a0b0b75e807c860eaa88800405a1359fac23" | npx wrangler secret put X_SERVICE_KEY --env development
echo "bc890df8b552039715fa6d06220da94c7da7b3a00d4fc649" | npx wrangler secret put AUTH_SERVICE_API_KEY --env development
echo "c0eaf53165dacc7a66421fa452810a87e5976157796ceaf5" | npx wrangler secret put LOGGER_SERVICE_API_KEY --env development
echo "e8e6b9611bd37e8c4f2e228dccbecaa09599368827fbf056" | npx wrangler secret put CONTENT_SKIMMER_API_KEY --env development
echo "80952338278d039ac69e360c1a76ba2568c54d3f8368c6a7f13b976bf3a4c80b" | npx wrangler secret put CROSS_DOMAIN_AUTH_KEY --env development
echo "d4016151d765ead85a7007913a7f8251" | npx wrangler secret put WEBHOOK_SIGNATURE_KEY --env development
echo "637a4c8eb78780d7ea3b6fed35f662151d4bf27cff3156fe3bf034e32f541fc4" | npx wrangler secret put FILE_ENCRYPTION_KEY --env development
echo "14b9a39ef25baf1f9f7450387be2aa83a108019e42521688" | npx wrangler secret put SESSION_ENCRYPTION_KEY --env development
echo "d4850356ef9471aa9c07dcd82c61fd7e" | npx wrangler secret put API_RATE_LIMIT_KEY --env development
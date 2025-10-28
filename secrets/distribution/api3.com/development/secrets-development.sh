#!/bin/bash
# Wrangler secret deployment for api3.com (development)
# Generated: 2025-10-28T09:30:38.875Z

echo "159967156f2f2244434ee875e34e4ee55bce8e49ab6938ff5eaa804d6b59e20f" | npx wrangler secret put AUTH_JWT_SECRET --env development
echo "3c8780218fdce38fc914dfdd248443e5711815c66326e18307ea7aa415f39778" | npx wrangler secret put X_SERVICE_KEY --env development
echo "5048908c3063cf15a0d1d4bcf48fe136fafb72851231a279" | npx wrangler secret put AUTH_SERVICE_API_KEY --env development
echo "e6bcad9d7cb10d66121b5704e06d4b46b776dc3cafee81cc" | npx wrangler secret put LOGGER_SERVICE_API_KEY --env development
echo "f8a2606889335c3d71f49766e1d769f227f006800ae99775" | npx wrangler secret put CONTENT_SKIMMER_API_KEY --env development
echo "d2b1061ba2b62298809a7b964a1fa5d362cf1dc8d44be33c034496dd748d8a24" | npx wrangler secret put CROSS_DOMAIN_AUTH_KEY --env development
echo "7377980a32e46d5c052e33af326b83a7" | npx wrangler secret put WEBHOOK_SIGNATURE_KEY --env development
echo "257c6768f030d25c717158c7cc9b524c4d3160833d8d0692618d5709af240faf" | npx wrangler secret put FILE_ENCRYPTION_KEY --env development
echo "ef659bfb894a18ccc309efa9af56c3d19fe7ff02e0920e8e" | npx wrangler secret put SESSION_ENCRYPTION_KEY --env development
echo "d67e5b623ab8bbae6d77a3f42dd8f7a4" | npx wrangler secret put API_RATE_LIMIT_KEY --env development
#!/usr/bin/env node
/*
Simple OAuth 1.0a helper for X API (Twitter) — no external deps.
Usage:
  node scripts/x-oauth1.js --dry-check
  node scripts/x-oauth1.js --post "message text"

Reads these env vars from GitHub Actions secrets or local env:
  X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET
*/

const crypto = require('crypto');
const { URLSearchParams } = require('url');

function percentEncode(str){
  return encodeURIComponent(str)
    .replace(/[!*()']/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

function generateNonce(length = 32){
  return crypto.randomBytes(length).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
}

function timestamp(){
  return Math.floor(Date.now() / 1000).toString();
}

function buildSignature(method, baseUrl, params, consumerSecret, tokenSecret){
  const sorted = Object.keys(params).sort().map(k => `${percentEncode(k)}=${percentEncode(params[k])}`).join('&');
  const baseString = [method.toUpperCase(), percentEncode(baseUrl), percentEncode(sorted)].join('&');
  const signingKey = `${percentEncode(consumerSecret)}&${tokenSecret ? percentEncode(tokenSecret) : ''}`;
  const hmac = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');
  return hmac;
}

function buildAuthHeader(params){
  const header = 'OAuth ' + Object.keys(params).sort().map(k => `${percentEncode(k)}="${percentEncode(params[k])}"`).join(', ');
  return header;
}

async function httpRequest(method, url, { body = null, extraParams = {} } = {}){
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_SECRET;

  if(!consumerKey || !consumerSecret || !accessToken || !accessSecret){
    console.error('Missing required X API credentials in env (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)');
    process.exit(2);
  }

  const oauth = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: generateNonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_token: accessToken,
    oauth_version: '1.0'
  };

  const urlObj = new URL(url);
  const queryParams = Object.fromEntries(urlObj.searchParams.entries());

  const allParams = Object.assign({}, queryParams, extraParams, oauth);
  // if body is JSON and method POST, do not include body in signature unless twitter requires; for tweets, parameters are in body as json (we won't include)

  const signature = buildSignature(method, urlObj.origin + urlObj.pathname, allParams, consumerSecret, accessSecret);
  oauth.oauth_signature = signature;

  const headers = {
    Authorization: buildAuthHeader(oauth),
    'Content-Type': 'application/json'
  };

  const fetch = globalThis.fetch || require('node-fetch');
  const opts = { method, headers };
  if(body){ opts.body = JSON.stringify(body); }

  const resp = await fetch(url, opts);
  const text = await resp.text();
  let json;
  try{ json = JSON.parse(text); } catch(e){ json = text; }
  return { status: resp.status, body: json };
}

async function dryCheck(){
  const url = 'https://api.twitter.com/2/users/me';
  console.log('Calling GET', url);
  const r = await httpRequest('GET', url);
  console.log('HTTP status:', r.status);
  console.log('Body:', JSON.stringify(r.body, null, 2));
  process.exit(r.status === 200 ? 0 : 1);
}

async function postTweet(message){
  const url = 'https://api.twitter.com/2/tweets';
  console.log('POST to', url);
  const r = await httpRequest('POST', url, { body: { text: message } });
  console.log('HTTP status:', r.status);
  console.log('Body:', JSON.stringify(r.body, null, 2));
  process.exit(r.status >=200 && r.status < 300 ? 0 : 1);
}

(async ()=>{
  const args = process.argv.slice(2);
  if(args.includes('--dry-check')){
    await dryCheck();
  } else if(args.includes('--post')){
    const i = args.indexOf('--post');
    const message = args[i+1] || '';
    if(!message){ console.error('Provide message after --post'); process.exit(2); }
    await postTweet(message);
  } else {
    console.error('Usage: --dry-check OR --post "message"');
    process.exit(2);
  }
})();

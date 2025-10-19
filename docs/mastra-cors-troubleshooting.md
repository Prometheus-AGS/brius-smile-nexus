# Mastra CORS Error Troubleshooting Guide

## Issue Summary
The Mastra production server at `https://mastra.brius.com` is returning CORS (Cross-Origin Resource Sharing) errors when accessed from the frontend application, preventing the BI assistant from functioning properly.

## Error Details
- **Error Type**: CORS error
- **Server**: https://mastra.brius.com
- **Client Origin**: http://localhost:8080 (development) / your-production-domain (production)
- **Status**: Requests are reaching the server (200 OK) but CORS headers are missing/incorrect

## Root Cause Analysis
CORS errors occur when:
1. The server doesn't include proper CORS headers in responses
2. The server doesn't allow the requesting origin (domain)
3. The server doesn't allow the HTTP methods being used (POST, OPTIONS)
4. The server doesn't allow the headers being sent (Authorization, Content-Type)

## Required Server-Side CORS Configuration

The Mastra server needs to be configured with the following CORS settings:

### For Development
```javascript
// Express.js example
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:5173',
    'http://localhost:3000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true
}));
```

### For Production
```javascript
// Express.js example
app.use(cors({
  origin: [
    'https://your-production-domain.com',
    'https://brius.com',
    'https://app.brius.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  credentials: true
}));
```

### Nginx Configuration (if using Nginx)
```nginx
location /api/ {
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    proxy_pass http://your-mastra-backend;
}
```

## Client-Side Workarounds (Temporary)

### 1. Disable Mastra Agent (Immediate Fix)
```bash
# In .env file
VITE_MASTRA_ENABLED=false
```

### 2. Use Development Proxy (Vite Configuration)
Add to `vite.config.ts`:
```typescript
export default defineConfig({
  // ... other config
  server: {
    proxy: {
      '/api/mastra': {
        target: 'https://mastra.brius.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/mastra/, '/api'),
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      }
    }
  }
});
```

Then update the Mastra client base URL to use the proxy:
```typescript
// In development
baseUrl: '/api/mastra'
```

## Testing CORS Configuration

### 1. Manual CORS Test
```bash
# Test preflight request
curl -X OPTIONS https://mastra.brius.com/api/agents \
  -H "Origin: http://localhost:8080" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v

# Expected response should include:
# Access-Control-Allow-Origin: http://localhost:8080
# Access-Control-Allow-Methods: POST, GET, OPTIONS
# Access-Control-Allow-Headers: Content-Type, Authorization
```

### 2. Browser DevTools Test
1. Open browser DevTools (F12)
2. Go to Network tab
3. Try to send a message in the BI assistant
4. Look for:
   - OPTIONS preflight request (should return 200/204)
   - POST request (should not show CORS error)

### 3. JavaScript Console Test
```javascript
// Test in browser console
fetch('https://mastra.brius.com/api/agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  body: JSON.stringify({ test: 'data' })
})
.then(response => console.log('Success:', response))
.catch(error => console.log('CORS Error:', error));
```

## Resolution Steps

### Immediate Actions (Client-Side)
1. **Disable Mastra Agent**: Set `VITE_MASTRA_ENABLED=false` until CORS is fixed
2. **Enable Fallback**: Ensure `VITE_MASTRA_FALLBACK_ENABLED=true` 
3. **Test Fallback**: Verify the application works with legacy system

### Server-Side Actions Required
1. **Configure CORS Headers**: Add proper CORS configuration to Mastra server
2. **Allow Origins**: Include your development and production domains
3. **Allow Methods**: Ensure POST, GET, OPTIONS are allowed
4. **Allow Headers**: Include Content-Type, Authorization headers
5. **Handle Preflight**: Properly handle OPTIONS requests

### Verification Steps
1. **Test Development**: Verify CORS works from `http://localhost:8080`
2. **Test Production**: Verify CORS works from production domain
3. **Test API Endpoints**: Verify all required endpoints are accessible
4. **Re-enable Agent**: Set `VITE_MASTRA_ENABLED=true` after CORS is fixed

## Common CORS Issues and Solutions

### Issue 1: Missing Access-Control-Allow-Origin
**Problem**: Server doesn't send `Access-Control-Allow-Origin` header
**Solution**: Add CORS middleware with proper origin configuration

### Issue 2: Preflight Request Failing
**Problem**: OPTIONS requests return 404 or 405
**Solution**: Add OPTIONS handler for all API routes

### Issue 3: Credentials Not Allowed
**Problem**: `Access-Control-Allow-Credentials` not set to true
**Solution**: Enable credentials in CORS configuration

### Issue 4: Headers Not Allowed
**Problem**: Authorization header blocked
**Solution**: Add Authorization to `Access-Control-Allow-Headers`

## Monitoring and Debugging

### Server Logs to Check
- CORS middleware initialization
- OPTIONS request handling
- Origin validation logic
- Header validation logic

### Client-Side Debugging
- Network tab in DevTools
- Console errors
- Preflight request details
- Response headers

## Contact Information

### For CORS Resolution
- **Server Administrator**: Configure CORS on Mastra server
- **DevOps Team**: Update server configuration and deployment
- **Network Team**: Verify firewall and proxy settings

### Testing Checklist
- [ ] CORS headers present in response
- [ ] Origin allowed for development domain
- [ ] Origin allowed for production domain
- [ ] POST method allowed
- [ ] Authorization header allowed
- [ ] Content-Type header allowed
- [ ] Preflight requests handled correctly
- [ ] Credentials enabled if needed

## Expected Timeline
- **Immediate**: Disable Mastra agent, enable fallback
- **Short-term**: Configure CORS on server (1-2 hours)
- **Verification**: Test and re-enable agent (30 minutes)
- **Monitoring**: Watch for any remaining issues (ongoing)
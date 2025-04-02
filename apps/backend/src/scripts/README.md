# Admin Tools

This directory contains administration tools for managing the application.

## Admin Token Generator

The admin token generator allows you to create secure JWT tokens for administrative access to the API. Using this local script is more secure than using the `/api/admin/token` endpoint, as it doesn't require transmitting the admin password over the network.

### Prerequisites

- Node.js and npm/pnpm installed
- Properly configured `.env` file with `ADMIN_JWT_SECRET` and optionally `ADMIN_JWT_EXPIRY`

### Usage

```bash
# Generate a token (will prompt for user ID if not provided)
npm run admin:token

# Generate a token for a specific user
npm run admin:token admin@example.com

# If using pnpm
pnpm run admin:token [userId]
```

### Security Best Practices

1. **Generate tokens on trusted machines only:** Only generate admin tokens on secure, trusted computers.

2. **Use short-lived tokens:** Admin tokens are configured to expire after 12 hours by default. For heightened security, consider setting a shorter expiry time in your `.env` file.

3. **Revoke compromised tokens:** If you suspect a token has been compromised, rotate the `ADMIN_JWT_SECRET` in your environment.

4. **Do not share tokens:** Each administrator should generate their own token with their own user ID for accountability.

5. **Secure your environment:** Ensure your `.env` file with the `ADMIN_JWT_SECRET` is properly secured and not committed to version control.

6. **Use over HTTPS only:** Only use admin tokens over HTTPS connections to prevent man-in-the-middle attacks.

### Example Integration

Here's how to use your generated admin token in various contexts:

#### cURL

```bash
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" https://your-api.com/api/cache/stats
```

#### JavaScript/TypeScript

```typescript
const response = await fetch('https://your-api.com/api/cache/stats', {
  headers: {
    'Authorization': `Bearer ${adminToken}`
  }
});
```

#### Postman

1. Add a new "Authorization" header
2. Set the type to "Bearer Token"
3. Paste your token in the token field 
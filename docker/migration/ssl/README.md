# SSL Certificate Configuration

This directory contains SSL certificates for the healthcare data migration system.

## Development Setup

For development, you can use self-signed certificates:

```bash
# Generate self-signed certificate for development
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout key.pem \
  -out cert.pem \
  -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate Diffie-Hellman parameters for enhanced security
openssl dhparam -out dhparam.pem 2048
```

## Production Setup

For production deployment:

1. Obtain SSL certificates from a trusted Certificate Authority (CA)
2. Place the following files in this directory:
   - `cert.pem` - SSL certificate
   - `key.pem` - Private key
   - `dhparam.pem` - Diffie-Hellman parameters
   - `chain.pem` - Certificate chain (if applicable)

## HIPAA Compliance Notes

- Ensure all certificates use strong encryption (RSA 2048-bit minimum)
- Use TLS 1.2 or higher protocols only
- Regularly rotate certificates (recommended: annually)
- Store private keys securely with restricted access
- Monitor certificate expiration dates

## File Permissions

Set appropriate permissions for security:

```bash
chmod 600 key.pem
chmod 644 cert.pem
chmod 644 dhparam.pem
```

## Certificate Validation

Validate your certificates before deployment:

```bash
# Check certificate details
openssl x509 -in cert.pem -text -noout

# Verify certificate and key match
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in key.pem | openssl md5
# Cryptography Expert — Code Examples

Reference material for the `cryptography-expert` skill. See [SKILL.md](../SKILL.md).

## Code Examples

### Symmetric Encryption (AES)

```python
# aes_encryption.py - AES encryption with Python cryptography library
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
import os
import base64

class AESCipher:
    def __init__(self, key):
        """Initialize with 256-bit key."""
        self.key = key if len(key) == 32 else self._derive_key(key)
        self.backend = default_backend()

    def _derive_key(self, password):
        """Derive a 256-bit key from password."""
        from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
        from cryptography.hazmat.primitives import hashes

        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b'static_salt',  # Should be random in production
            iterations=100000,
            backend=self.backend
        )
        return kdf.derive(password.encode())

    def encrypt(self, plaintext):
        """Encrypt plaintext using AES-256-CBC."""
        # Generate random IV
        iv = os.urandom(16)

        # Pad plaintext to block size
        padder = padding.PKCS7(128).padder()
        padded_data = padder.update(plaintext.encode()) + padder.finalize()

        # Encrypt
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.CBC(iv),
            backend=self.backend
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(padded_data) + encryptor.finalize()

        # Combine IV and ciphertext
        return base64.b64encode(iv + ciphertext).decode()

    def decrypt(self, ciphertext_b64):
        """Decrypt ciphertext using AES-256-CBC."""
        # Decode and split IV and ciphertext
        data = base64.b64decode(ciphertext_b64)
        iv = data[:16]
        ciphertext = data[16:]

        # Decrypt
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.CBC(iv),
            backend=self.backend
        )
        decryptor = cipher.decryptor()
        padded_plaintext = decryptor.update(ciphertext) + decryptor.finalize()

        # Remove padding
        unpadder = padding.PKCS7(128).unpadder()
        plaintext = unpadder.update(padded_plaintext) + unpadder.finalize()

        return plaintext.decode()

# Usage
if __name__ == "__main__":
    cipher = AESCipher("my_secret_password")

    message = "Sensitive data to encrypt"
    encrypted = cipher.encrypt(message)
    print(f"Encrypted: {encrypted}")

    decrypted = cipher.decrypt(encrypted)
    print(f"Decrypted: {decrypted}")
```

### Asymmetric Encryption (RSA)

```python
# rsa_encryption.py - RSA key generation and encryption
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

class RSACipher:
    def __init__(self, key_size=2048):
        """Generate RSA key pair."""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend()
        )
        self.public_key = self.private_key.public_key()

    def save_keys(self, private_path, public_path, password=None):
        """Save keys to files."""
        # Save private key
        encryption = serialization.BestAvailableEncryption(password.encode()) \
            if password else serialization.NoEncryption()

        with open(private_path, 'wb') as f:
            f.write(self.private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=encryption
            ))

        # Save public key
        with open(public_path, 'wb') as f:
            f.write(self.public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ))

    def load_keys(self, private_path, password=None):
        """Load keys from files."""
        with open(private_path, 'rb') as f:
            self.private_key = serialization.load_pem_private_key(
                f.read(),
                password=password.encode() if password else None,
                backend=default_backend()
            )
        self.public_key = self.private_key.public_key()

    def encrypt(self, plaintext):
        """Encrypt with public key."""
        ciphertext = self.public_key.encrypt(
            plaintext.encode(),
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return ciphertext

    def decrypt(self, ciphertext):
        """Decrypt with private key."""
        plaintext = self.private_key.decrypt(
            ciphertext,
            padding.OAEP(
                mgf=padding.MGF1(algorithm=hashes.SHA256()),
                algorithm=hashes.SHA256(),
                label=None
            )
        )
        return plaintext.decode()

    def sign(self, message):
        """Sign message with private key."""
        signature = self.private_key.sign(
            message.encode(),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature

    def verify(self, message, signature):
        """Verify signature with public key."""
        try:
            self.public_key.verify(
                signature,
                message.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except:
            return False

# Usage
if __name__ == "__main__":
    rsa_cipher = RSACipher(key_size=2048)

    # Encryption
    message = "Secret message"
    encrypted = rsa_cipher.encrypt(message)
    decrypted = rsa_cipher.decrypt(encrypted)
    print(f"Original: {message}")
    print(f"Decrypted: {decrypted}")

    # Digital signature
    signature = rsa_cipher.sign(message)
    is_valid = rsa_cipher.verify(message, signature)
    print(f"Signature valid: {is_valid}")
```

### TLS/SSL Certificate Management

```python
# certificate_management.py - X.509 certificate operations
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtensionOID
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import datetime

def generate_self_signed_cert(
    common_name,
    country="US",
    state="California",
    locality="San Francisco",
    organization="My Company",
    validity_days=365
):
    """Generate a self-signed certificate."""
    # Generate private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )

    # Subject and issuer (same for self-signed)
    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, country),
        x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, state),
        x509.NameAttribute(NameOID.LOCALITY_NAME, locality),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, organization),
        x509.NameAttribute(NameOID.COMMON_NAME, common_name),
    ])

    # Build certificate
    cert = x509.CertificateBuilder().subject_name(
        subject
    ).issuer_name(
        issuer
    ).public_key(
        private_key.public_key()
    ).serial_number(
        x509.random_serial_number()
    ).not_valid_before(
        datetime.datetime.utcnow()
    ).not_valid_after(
        datetime.datetime.utcnow() + datetime.timedelta(days=validity_days)
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(common_name),
            x509.DNSName(f"*.{common_name}"),
        ]),
        critical=False,
    ).add_extension(
        x509.BasicConstraints(ca=False, path_length=None),
        critical=True,
    ).add_extension(
        x509.KeyUsage(
            digital_signature=True,
            key_encipherment=True,
            content_commitment=False,
            data_encipherment=False,
            key_agreement=False,
            key_cert_sign=False,
            crl_sign=False,
            encipher_only=False,
            decipher_only=False,
        ),
        critical=True,
    ).sign(private_key, hashes.SHA256(), default_backend())

    return cert, private_key

def generate_csr(common_name, private_key):
    """Generate a Certificate Signing Request."""
    csr = x509.CertificateSigningRequestBuilder().subject_name(
        x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, "US"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, "California"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, "San Francisco"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "My Company"),
            x509.NameAttribute(NameOID.COMMON_NAME, common_name),
        ])
    ).add_extension(
        x509.SubjectAlternativeName([
            x509.DNSName(common_name),
        ]),
        critical=False,
    ).sign(private_key, hashes.SHA256(), default_backend())

    return csr

def verify_certificate(cert_pem, ca_cert_pem=None):
    """Verify certificate validity and chain."""
    from cryptography.x509 import load_pem_x509_certificate

    cert = load_pem_x509_certificate(cert_pem.encode(), default_backend())

    # Check expiration
    now = datetime.datetime.utcnow()
    if now < cert.not_valid_before or now > cert.not_valid_after:
        return False, "Certificate expired or not yet valid"

    # Verify signature if CA cert provided
    if ca_cert_pem:
        ca_cert = load_pem_x509_certificate(ca_cert_pem.encode(), default_backend())
        try:
            ca_cert.public_key().verify(
                cert.signature,
                cert.tbs_certificate_bytes,
                padding.PKCS1v15(),
                cert.signature_hash_algorithm,
            )
        except:
            return False, "Invalid signature"

    return True, "Valid certificate"
```

### OpenSSL Command Reference

```bash
# Generate private key
openssl genrsa -out private.key 2048
openssl ecparam -genkey -name secp256k1 -out ec_private.key

# Generate public key from private
openssl rsa -in private.key -pubout -out public.key

# Generate self-signed certificate
openssl req -x509 -newkey rsa:2048 -keyout key.pem -out cert.pem -days 365 -nodes

# Generate Certificate Signing Request (CSR)
openssl req -new -key private.key -out request.csr

# View certificate details
openssl x509 -in cert.pem -text -noout

# View CSR details
openssl req -in request.csr -text -noout

# Verify certificate
openssl verify -CAfile ca.pem cert.pem

# Test TLS connection
openssl s_client -connect example.com:443 -showcerts

# Convert certificate formats
openssl x509 -in cert.pem -outform der -out cert.der
openssl x509 -in cert.der -inform der -outform pem -out cert.pem

# Create PKCS12 bundle
openssl pkcs12 -export -out bundle.p12 -inkey private.key -in cert.pem

# Extract from PKCS12
openssl pkcs12 -in bundle.p12 -out cert.pem -nokeys
openssl pkcs12 -in bundle.p12 -out private.key -nocerts -nodes

# Check private key matches certificate
openssl x509 -noout -modulus -in cert.pem | openssl md5
openssl rsa -noout -modulus -in private.key | openssl md5

# Generate strong random password
openssl rand -base64 32

# Encrypt/decrypt files
openssl enc -aes-256-cbc -salt -in file.txt -out file.enc
openssl enc -aes-256-cbc -d -in file.enc -out file.txt
```

### Hash Functions and HMAC

```python
# hashing.py - Cryptographic hash functions
import hashlib
import hmac
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend
import os
import base64

def hash_password(password, salt=None):
    """Hash password using PBKDF2."""
    if salt is None:
        salt = os.urandom(32)

    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )

    key = base64.b64encode(kdf.derive(password.encode()))
    return {
        'hash': key.decode(),
        'salt': base64.b64encode(salt).decode()
    }

def verify_password(password, stored_hash, stored_salt):
    """Verify password against stored hash."""
    salt = base64.b64decode(stored_salt)
    result = hash_password(password, salt)
    return result['hash'] == stored_hash

def compute_hmac(message, key):
    """Compute HMAC-SHA256."""
    h = hmac.new(key.encode(), message.encode(), hashlib.sha256)
    return h.hexdigest()

def verify_hmac(message, key, signature):
    """Verify HMAC signature."""
    expected = compute_hmac(message, key)
    return hmac.compare_digest(expected, signature)

def hash_file(filepath, algorithm='sha256'):
    """Compute hash of file."""
    h = hashlib.new(algorithm)

    with open(filepath, 'rb') as f:
        while chunk := f.read(8192):
            h.update(chunk)

    return h.hexdigest()

# Usage
if __name__ == "__main__":
    # Password hashing
    password = "my_secure_password"
    result = hash_password(password)
    print(f"Hash: {result['hash']}")
    print(f"Salt: {result['salt']}")

    # Verify password
    is_valid = verify_password(password, result['hash'], result['salt'])
    print(f"Password valid: {is_valid}")

    # HMAC
    message = "Important message"
    key = "secret_key"
    signature = compute_hmac(message, key)
    print(f"HMAC: {signature}")

    # Verify HMAC
    is_valid = verify_hmac(message, key, signature)
    print(f"HMAC valid: {is_valid}")
```

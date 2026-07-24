# pyrefly: ignore [missing-import]
from py_vapid import Vapid
import json

import json

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

# Generate P-256 private key
private_key = ec.generate_private_key(ec.SECP256R1())

# Get public key bytes (uncompressed format is required for VAPID)
public_key = private_key.public_key()

# Serialize keys to PEM format
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

# Public key needs to be uncompressed bytes for VAPID
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

print("\n=== Generate new VAPID keys for server config ===")
print(f"\nPrivate Key (save in .env file as VAPID_PRIVATE_KEY):\n{private_pem.decode('utf-8')}")
print(f"\nPublic Key (save in .env file as VAPID_PUBLIC_KEY):\n{public_bytes.hex()}")
print("\n(Public key can also be:", public_bytes.hex()[:130], "with 04 prefix)")

vapid = Vapid()
# This doesn't seem to have a simple 'generate' method that returns strings easily.
# Let's try the cryptography way since Vapid uses it.
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64

private_key = ec.generate_private_key(ec.SECP256R1())
public_key = private_key.public_key()

private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)

public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)

# VAPID requires URL-safe base64 without padding
def b64url(b):
    return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

# Actually py_vapid has a save method, but we want strings.
# The public key for VAPID is just the uncompressed point.

print(json.dumps({
    "private_key": private_bytes.decode('utf-8'),
    "public_key": b64url(public_bytes)
}, indent=2))

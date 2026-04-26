from py_vapid import Vapid
import json

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

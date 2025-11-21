//! DataSphere Cryptography Module
//!
//! Provides end-to-end encryption using:
//! - ChaCha20-Poly1305 for authenticated encryption
//! - Argon2id for key derivation from master password

use chacha20poly1305::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    ChaCha20Poly1305, Key, Nonce,
};
use argon2::{
    password_hash::{PasswordHasher, SaltString},
    Argon2, Params,
};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use zeroize::Zeroizing;

use super::DataSphereError;

/// Encrypted data container
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EncryptedData {
    /// Base64-encoded ciphertext
    pub ciphertext: String,
    /// Base64-encoded nonce (12 bytes for ChaCha20-Poly1305)
    pub nonce: String,
    /// Salt used for key derivation (if password-based)
    pub salt: Option<String>,
    /// Version for future compatibility
    pub version: u8,
}

/// Cryptographic operations for DataSphere
pub struct DataSphereCrypto {
    cipher: ChaCha20Poly1305,
}

impl DataSphereCrypto {
    /// Create a new crypto instance with a derived key from password
    pub fn from_password(password: &str, salt: &[u8]) -> Result<Self, DataSphereError> {
        let key = Self::derive_key(password, salt)?;
        let cipher = ChaCha20Poly1305::new(Key::from_slice(&key));
        Ok(Self { cipher })
    }

    /// Create a new crypto instance with a raw 32-byte key
    pub fn from_key(key: &[u8; 32]) -> Self {
        let cipher = ChaCha20Poly1305::new(Key::from_slice(key));
        Self { cipher }
    }

    /// Generate a new random 32-byte key
    pub fn generate_key() -> [u8; 32] {
        let key = ChaCha20Poly1305::generate_key(&mut OsRng);
        let mut result = [0u8; 32];
        result.copy_from_slice(key.as_slice());
        result
    }

    /// Generate a new random salt (16 bytes)
    pub fn generate_salt() -> [u8; 16] {
        let mut salt = [0u8; 16];
        use rand::RngCore;
        OsRng.fill_bytes(&mut salt);
        salt
    }

    /// Derive a key from password using Argon2id
    fn derive_key(password: &str, salt: &[u8]) -> Result<Zeroizing<[u8; 32]>, DataSphereError> {
        // Use secure Argon2id parameters
        let params = Params::new(
            65536,  // 64 MB memory
            3,      // 3 iterations
            1,      // 1 parallelism (single-threaded for security)
            Some(32), // 32-byte output
        )
        .map_err(|e| DataSphereError::Encryption(e.to_string()))?;

        let argon2 = Argon2::new(argon2::Algorithm::Argon2id, argon2::Version::V0x13, params);

        let salt_string = SaltString::encode_b64(salt)
            .map_err(|e| DataSphereError::Encryption(e.to_string()))?;

        let hash = argon2
            .hash_password(password.as_bytes(), &salt_string)
            .map_err(|e| DataSphereError::Encryption(e.to_string()))?;

        let hash_bytes = hash.hash.ok_or_else(|| {
            DataSphereError::Encryption("Failed to get hash output".to_string())
        })?;

        let mut key = Zeroizing::new([0u8; 32]);
        key.copy_from_slice(hash_bytes.as_bytes());
        Ok(key)
    }

    /// Encrypt data
    pub fn encrypt(&self, plaintext: &[u8]) -> Result<EncryptedData, DataSphereError> {
        let nonce = ChaCha20Poly1305::generate_nonce(&mut OsRng);

        let ciphertext = self
            .cipher
            .encrypt(&nonce, plaintext)
            .map_err(|e| DataSphereError::Encryption(e.to_string()))?;

        Ok(EncryptedData {
            ciphertext: BASE64.encode(&ciphertext),
            nonce: BASE64.encode(nonce.as_slice()),
            salt: None,
            version: 1,
        })
    }

    /// Decrypt data
    pub fn decrypt(&self, encrypted: &EncryptedData) -> Result<Vec<u8>, DataSphereError> {
        let ciphertext = BASE64
            .decode(&encrypted.ciphertext)
            .map_err(|e| DataSphereError::Decryption(e.to_string()))?;

        let nonce_bytes = BASE64
            .decode(&encrypted.nonce)
            .map_err(|e| DataSphereError::Decryption(e.to_string()))?;

        let nonce = Nonce::from_slice(&nonce_bytes);

        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext.as_slice())
            .map_err(|e| DataSphereError::Decryption(e.to_string()))?;

        Ok(plaintext)
    }

    /// Encrypt a serializable object to JSON
    pub fn encrypt_json<T: Serialize>(&self, data: &T) -> Result<EncryptedData, DataSphereError> {
        let json = serde_json::to_vec(data)?;
        self.encrypt(&json)
    }

    /// Decrypt JSON data to an object
    pub fn decrypt_json<T: for<'de> Deserialize<'de>>(
        &self,
        encrypted: &EncryptedData,
    ) -> Result<T, DataSphereError> {
        let plaintext = self.decrypt(encrypted)?;
        let data = serde_json::from_slice(&plaintext)?;
        Ok(data)
    }
}

/// Encrypted vault file structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultFile {
    /// Magic bytes for file identification
    pub magic: String,
    /// Vault format version
    pub version: u8,
    /// Salt for key derivation
    pub salt: String,
    /// Encrypted vault data
    pub data: EncryptedData,
}

impl VaultFile {
    pub const MAGIC: &'static str = "NEXUS_VAULT";
    pub const VERSION: u8 = 1;

    /// Create a new vault file
    pub fn new(salt: &[u8], data: EncryptedData) -> Self {
        Self {
            magic: Self::MAGIC.to_string(),
            version: Self::VERSION,
            salt: BASE64.encode(salt),
            data,
        }
    }

    /// Validate vault file
    pub fn validate(&self) -> Result<(), DataSphereError> {
        if self.magic != Self::MAGIC {
            return Err(DataSphereError::Decryption("Invalid vault file".to_string()));
        }
        if self.version != Self::VERSION {
            return Err(DataSphereError::Decryption(format!(
                "Unsupported vault version: {}",
                self.version
            )));
        }
        Ok(())
    }

    /// Get salt bytes
    pub fn get_salt(&self) -> Result<Vec<u8>, DataSphereError> {
        BASE64
            .decode(&self.salt)
            .map_err(|e| DataSphereError::Decryption(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_encrypt_decrypt() {
        let key = DataSphereCrypto::generate_key();
        let crypto = DataSphereCrypto::from_key(&key);

        let plaintext = b"Hello, World!";
        let encrypted = crypto.encrypt(plaintext).unwrap();
        let decrypted = crypto.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_password_based_encryption() {
        let password = "test-password-123";
        let salt = DataSphereCrypto::generate_salt();

        let crypto = DataSphereCrypto::from_password(password, &salt).unwrap();

        let plaintext = b"Secret data";
        let encrypted = crypto.encrypt(plaintext).unwrap();

        // Create new instance with same password and salt
        let crypto2 = DataSphereCrypto::from_password(password, &salt).unwrap();
        let decrypted = crypto2.decrypt(&encrypted).unwrap();

        assert_eq!(plaintext.as_slice(), decrypted.as_slice());
    }

    #[test]
    fn test_json_encryption() {
        #[derive(Debug, Serialize, Deserialize, PartialEq)]
        struct TestData {
            name: String,
            value: i32,
        }

        let key = DataSphereCrypto::generate_key();
        let crypto = DataSphereCrypto::from_key(&key);

        let data = TestData {
            name: "test".to_string(),
            value: 42,
        };

        let encrypted = crypto.encrypt_json(&data).unwrap();
        let decrypted: TestData = crypto.decrypt_json(&encrypted).unwrap();

        assert_eq!(data, decrypted);
    }
}

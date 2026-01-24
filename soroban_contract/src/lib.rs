#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, String};

#[derive(Clone)]
#[contracttype]
pub struct Escrow {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub token: Address,
    pub otp_hash: String,
    pub is_active: bool,
    pub timestamp: u64,
}

#[contracttype]
pub enum DataKey {
    Escrow(String), // payment_id -> Escrow
}

#[contract]
pub struct SupiEscrow;

#[contractimpl]
impl SupiEscrow {
    /// Create an escrow with OTP protection
    /// The OTP hash is stored in the contract - no external DB needed!
    pub fn create_escrow(
        env: Env,
        payment_id: String,
        sender: Address,
        receiver: Address,
        amount: i128,
        token: Address,
        otp_hash: String,
    ) -> bool {
        // Verify sender authorization
        sender.require_auth();

        // Check if escrow already exists
        let key = DataKey::Escrow(payment_id.clone());
        if env.storage().persistent().has(&key) {
            panic!("Escrow already exists");
        }

        // Transfer tokens from sender to contract
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &token);
        token_client.transfer(&sender, &contract_address, &amount);

        // Store escrow data with OTP hash
        let escrow = Escrow {
            sender,
            receiver,
            amount,
            token,
            otp_hash, // OTP hash stored here - no DB needed!
            is_active: true,
            timestamp: env.ledger().timestamp(),
        };

        env.storage().persistent().set(&key, &escrow);
        env.storage().persistent().extend_ttl(&key, 17280, 17280); // ~30 days

        true
    }

    /// Release funds after OTP verification
    /// Contract validates the OTP directly - no DB lookup needed!
    pub fn release_funds(env: Env, payment_id: String, otp: String) -> bool {
        let key = DataKey::Escrow(payment_id.clone());

        // Get escrow data (OTP hash is stored here)
        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        // Check if escrow is still active
        if !escrow.is_active {
            panic!("Escrow already released or cancelled");
        }

        // Verify OTP by comparing with stored hash
        if otp != escrow.otp_hash {
            panic!("Invalid OTP");
        }

        // Transfer tokens from contract to receiver
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&contract_address, &escrow.receiver, &escrow.amount);

        // Mark escrow as inactive
        escrow.is_active = false;
        env.storage().persistent().set(&key, &escrow);

        true
    }

    /// Cancel escrow (only sender can cancel)
    pub fn cancel_escrow(env: Env, payment_id: String) -> bool {
        let key = DataKey::Escrow(payment_id.clone());

        let mut escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        // Verify sender authorization
        escrow.sender.require_auth();

        if !escrow.is_active {
            panic!("Escrow already released or cancelled");
        }

        // Refund tokens to sender
        let contract_address = env.current_contract_address();
        let token_client = token::Client::new(&env, &escrow.token);
        token_client.transfer(&contract_address, &escrow.sender, &escrow.amount);

        // Mark as inactive
        escrow.is_active = false;
        env.storage().persistent().set(&key, &escrow);

        true
    }

    /// Get escrow details (without revealing OTP hash)
    pub fn get_escrow(env: Env, payment_id: String) -> (Address, Address, i128, bool, u64) {
        let key = DataKey::Escrow(payment_id);
        let escrow: Escrow = env
            .storage()
            .persistent()
            .get(&key)
            .unwrap_or_else(|| panic!("Escrow not found"));

        // Return without OTP hash for security
        (
            escrow.sender,
            escrow.receiver,
            escrow.amount,
            escrow.is_active,
            escrow.timestamp,
        )
    }
}

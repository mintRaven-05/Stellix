<h1 align=center>Stellix - sUPI</h1>
<h2 align=center>NullPointers<br>Stellar Build-A-Thon, Kolkata</h2>

<br/>
GDRIVE LINK (PPT and DEMO): https://drive.google.com/drive/folders/1YnKzSFQqTff23GQBHAI75z38xr1eyLqb?usp=sharing

## Contract Address and assets: 
- Contract Address: CDFXJWPGADPOVK6MROIKOT3RRANCZ576AJSM5JG3WTZRTY6YEYHSMSCC
- INRPC stablecoin distributor public key (with Liquidity Pool): GBY2U4EXSIKIOILN3WXE6LCJ4PBNKXHHPGIZFALMPQROWMRFVZHOA346

## Project Overview

Stellix is a hybrid decentralized payment infrastructure designed to bridge the gap between traditional financial systems and Web3. It combines blockchain transparency and speed with familiar banking-grade security mechanisms to deliver a seamless, secure, and user-friendly digital payment experience.

Built on the Stellar Network, Stellix enables fast, low-cost peer-to-peer and cross-border payments while abstracting the complexity of blockchain interactions for end users. The platform focuses on trust, usability, and interoperability, making decentralized finance accessible to both crypto-native and non-crypto users.

---
<div align=center>

  <img width="1280" height="784" alt="image" src="https://github.com/user-attachments/assets/7c6ee34b-caed-4d37-97ca-3ac60e82f379" />
  
  <div>
    <img width="240" height="500" alt="image" src="https://github.com/user-attachments/assets/37028e12-d1ea-406b-90fe-9b7855ba6804" />
    <img width="240" height="500" alt="image" src="https://github.com/user-attachments/assets/7fecd557-fe3c-4111-a6a5-845349552739" />

  </div>

</div>

---

## Problem Statement

Current digital payment systems face several limitations:

- Fragmented and inefficient payment infrastructures  
- High fees and slow settlement for cross-border transfers  
- Poor usability and security concerns in crypto-based payments  
- Low user trust due to lack of consumer protection mechanisms  

These issues hinder mainstream adoption of blockchain-based payments.

---

## Solution

Stellix introduces a hybrid payment model that merges traditional financial safeguards with blockchain efficiency.

Key design principles:
- Familiar security flows for users  
- Automated asset interoperability  
- Transparent and verifiable settlement  
- Minimal user exposure to Web3 complexity  

---

## Key Features

#### OTP-Based Transaction Security
Each transaction is protected using one-time password (OTP) verification, adding a banking-style authentication layer before blockchain settlement.

#### Escrow-Style Payment Protection
Funds are securely held until transaction conditions are fulfilled, ensuring safety and trust for both sender and recipient.

#### Smart Cross-Asset Conversion
Stellix supports automatic asset conversion during payments. Users can send one asset while the recipient receives their preferred asset without manual intervention.

Example:
- Sender pays in XLM  
- Receiver receives INRPC  
- Conversion is handled seamlessly in the backend  

### Stellar-Native Infrastructure
- Near-instant transaction finality  
- Extremely low transaction fees  
- Native support for multi-asset payments  

---

## MVP Capabilities

- Live multi-asset wallet integration  
- Secure peer-to-peer payments  
- QR-based scan-and-pay transactions  
- Real-time balance updates and transaction tracking  
- Support for XLM, USDC, USDT, INRPC, and other Stellar-issued assets  

The MVP is functional and production-ready for scaling.

---

## System Architecture for protected payment (High-Level)

1. User initiates protected payment from Stellix app  
2. OTP is generated
3. Funds are locked in escrow logic  
4. Asset conversion is executed if required  
5. Final settlement occurs on the Stellar blockchain if OTP is verified by receiver  

---

## Future Roadmap

- Integration with banks and fintech partners  
- Expansion into cross-border remittance services  
- Enterprise-grade blockchain payment solutions  
- AI-driven fraud detection and risk analysis  

---

## Tech Stack

- Blockchain: Stellar Network  
- Backend: Node.js, Express, Appwrite  
- Blockchain SDK: Stellar SDK  
- Frontend: Next.js (Mobile first UI)  
- Security: OTP verification, escrow-based logic, with Shamir's SSS logic

---

<div align=center>

## Team

**Null-Pointers – Stellar Build-A-Thon, Kolkata**  
*A blockchain payment app that makes crypto as simple as UPI.*

<a href="https://github.com/mintRaven-05"><img src="https://github.com/user-attachments/assets/b13b65a5-2b53-46c2-baca-b04abbd7f082" height=70 width=70></a>
<a href="https://github.com/ImonChakraborty"><img src="https://github.com/user-attachments/assets/72edcdd2-e06b-40a1-89a4-eeae562bf842" height=70 width=70></a>
<a href="https://github.com/nilanjan-mondal"><img src="https://github.com/user-attachments/assets/c0336e8b-334c-46e0-9743-1b4df092ea23" height=70 width=70></a>


<br><br><br>

</div>

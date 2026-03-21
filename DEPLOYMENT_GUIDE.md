# CC Licensing dApp — Setup, Deployment & Vercel Guide

---

## 1. Project File Structure

```
cc-licensing-dapp/
├── package.json
├── vercel.json
├── .env
├── .gitignore
├── CCassetLicensing.sol
├── DEPLOYMENT_GUIDE.md
├── public/
│   └── index.html
└── src/
    ├── App.js
    ├── App.css
    ├── audio.js
    ├── images.js
    ├── video.js
    ├── documents.js
    ├── ledger.js
    ├── index.js
    ├── index.css
    ├── reportWebVitals.js
    ├── setupTests.js
    ├── abi/
    │   └── abi.json
    ├── data/
    │   └── manifest.json
    └── components/
        ├── ContractLogic.js
        ├── ContractContext.js
        ├── AssetCard.js
        ├── Header.js
        └── Header.css
```

---

## 2. Install Dependencies

```bash
npm install ethers react-router-dom react-icons
```

---

## 3. IPFS File Structure

### A) Asset files folder
Actual downloadable CC-licensed files, named {id}.{type} (e.g. 1.wav, 51.jpg).

Asset folder CID:
  bafybeidandiplakjlyquyf36gdb72rsh6tsc4pmdcjq444fnepqifuyo3e

### B) Metadata folder
Contains manifest.json and all 200 token JSON files (1.json–200.json).

Metadata folder CID:
  bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu

baseURI (used in contract deployment):
  https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/

Verify these load before deploying:
  https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/1.json
  https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/manifest.json

### C) Icon images folder
CID: bafybeiczjm4tlzvqrl5g5t7vafnnsfmt2f2n5zqhf3fx6ieruetojg2slq
Files: icon_Music.png, icon_Images.png, icon_Video.png, icon_Docs.png

---

## 4. Smart Contract

### Deployed contract
Address: 0xa26B3508986094AB3512c1c5d41AaCc48b8457FE
Network: Sepolia testnet
Verified: https://sepolia.etherscan.io/address/0xa26B3508986094AB3512c1c5d41AaCc48b8457FE

### Contract overview
- ERC1155 compliant, using OpenZeppelin
- SPDX-License-Identifier: UNLICENSED
- Two-step licensing flow: agree(tokenId) → mint(tokenId, title, creator, license)
- Emits CCassetLicensed event with: licensee, tokenId, title, creator, license, agreement
- baseURI is set at deployment and readable via contract.baseURI()
- No registerAsset() required — all metadata flows from IPFS through the frontend

### To redeploy (if contract changes)
1. Open Remix: https://remix.ethereum.org
2. Paste CCassetLicensing.sol into a new file
3. Compiler tab → version 0.8.2 or higher → Compile
4. Deploy & Run tab → Environment: Injected Provider – MetaMask
5. Ensure MetaMask is on Sepolia (get ETH from https://sepoliafaucet.com)
6. Constructor _BASEURI field:
   https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/
7. Click Deploy and confirm in MetaMask
8. Copy the new contract address and update .env (see Section 5)
9. Re-verify on Etherscan using the flattened file:
   - Right-click CCassetLicensing.sol in Remix → Flatten
   - Go to contract page on Sepolia Etherscan → Contract → Verify and Publish
   - Compiler: Solidity (Single file), version 0.8.2+, No License (None)
   - Paste the flattened code and submit

---

## 5. Environment Variables

Create a .env file in your project root (same level as package.json):

```
REACT_APP_CONTRACT_ADDRESS=0xa26B3508986094AB3512c1c5d41AaCc48b8457FE
REACT_APP_RPC_URL=https://sepolia.infura.io/v3/your-infura-api-key
```

These are used in:
- src/components/ContractLogic.js → REACT_APP_CONTRACT_ADDRESS
- src/ledger.js → REACT_APP_CONTRACT_ADDRESS and REACT_APP_RPC_URL

IMPORTANT: Add .env to your .gitignore so it is never pushed to GitHub:

```
# .gitignore
.env
node_modules/
build/
```

---

## 6. Test Locally

```bash
npm start
```

- Open http://localhost:3000
- Home page: centered welcome text
- Asset pages (Audio, Images, Video, Documents): tokens load from IPFS on demand
- Connect MetaMask on Sepolia to license assets
- Licensing flow:
    1. Check the agreement checkbox
    2. Click "License this asset"
    3. Approve agree() transaction in MetaMask
    4. Approve mint(tokenId, title, creator, license) transaction in MetaMask
    5. Download button appears after confirmation
    6. On refresh, download button persists for previously licensed assets
- Ledger page: shows all CCassetLicensed events with search and sort

---

## 7. Deploy to Vercel

### Step 1: Create vercel.json in your project root
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Step 2: Push to GitHub
Make sure .env is in your .gitignore before pushing.

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 3: Import to Vercel
1. Go to https://vercel.com and sign in with your GitHub account
2. Click Add New → Project
3. Select your GitHub repository
4. Verify build settings:
   - Framework Preset: Create React App
   - Build Command: npm run build
   - Output Directory: build
   - Install Command: npm install
5. Do NOT click Deploy yet — add environment variables first (Step 4)

### Step 4: Add environment variables in Vercel
In the same import screen, scroll down to Environment Variables and add:

  REACT_APP_CONTRACT_ADDRESS = 0xa26B3508986094AB3512c1c5d41AaCc48b8457FE
  REACT_APP_RPC_URL = https://sepolia.infura.io/v3/your-infura-api-key

These must be added here since your .env file is not pushed to GitHub.

### Step 5: Deploy
Click Deploy. Vercel will build and host your app. You will get a URL like:
  https://your-project-name.vercel.app

### Step 6: Verify it works
- Visit your Vercel URL
- Navigate to each asset page and confirm tokens load
- Connect MetaMask on Sepolia and test the licensing flow
- Check the Ledger page loads events correctly

---

## 8. Updating the deployed app

Any time you push changes to your GitHub main branch, Vercel will
automatically rebuild and redeploy. No manual steps needed.

If you change the contract and redeploy to Sepolia:
1. Update REACT_APP_CONTRACT_ADDRESS in Vercel:
   Project Settings → Environment Variables → edit the value
2. Trigger a redeploy: Deployments tab → Redeploy

---

## 9. Key URLs

Sepolia Etherscan contract:
  https://sepolia.etherscan.io/address/0xa26B3508986094AB3512c1c5d41AaCc48b8457FE

Sepolia faucet (free test ETH):
  https://sepoliafaucet.com

Pinata (IPFS pinning):
  https://pinata.cloud

Infura (RPC provider):
  https://infura.io

Remix IDE:
  https://remix.ethereum.org
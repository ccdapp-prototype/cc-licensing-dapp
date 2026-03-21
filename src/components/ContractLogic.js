import { ethers } from "ethers";
import { useState, useEffect, useCallback } from "react";
import abi from "../abi/abi.json";
import manifest from "../data/manifest.json";

// ─── Contract address loaded from environment variable ───────────────────────
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
// ─────────────────────────────────────────────────────────────────────────────

const ContractLogic = () => {
  const [account, setAccount]                   = useState("");
  const [provider, setProvider]                 = useState(null);
  const [signer, setSigner]                     = useState(null);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [baseURI, setBaseURI] = useState("https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/");
  const [hasAgreedIds, setHasAgreedIds]         = useState([]);
  const [mintStatus, setMintStatus]             = useState({});
  const [mintError, setMintError]               = useState({});

  // Per-page token data: fetched on demand, cached here
  const [tokenCache, setTokenCache]   = useState({});
  const [loadingTypes, setLoadingTypes] = useState({});
  const [loadError, setLoadError]     = useState({});
  const [balancesLoaded, setBalancesLoaded] = useState(false);

  // ── Wallet connection ──────────────────────────────────────────────────────

  const initConnection = useCallback(async () => {
    if (typeof window.ethereum === "undefined") {
      setConnectionStatus("Please install a web3 wallet. Recommendation: MetaMask.");
      return;
    }

    setConnectionStatus("Waiting for connection...");

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      const tempSigner   = await tempProvider.getSigner();

      setProvider(tempProvider);
      setSigner(tempSigner);
      setAccount(accounts[0]);
      setConnectionStatus("Connected.");
    } catch (error) {
      if (error.code === 4001) {
        setConnectionStatus("You rejected the wallet connection.");
      } else if (error.code === -32002) {
        setConnectionStatus("Connection request already pending — check your wallet.");
      } else {
        console.error("Connection error:", error);
        setConnectionStatus(`Error: ${error.message?.substring(0, 60)}...`);
      }
    }
  }, []);

  // ── Auto-connect on load; listen for account changes ──────────────────────

  useEffect(() => {
    initConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          setSigner(null);
          setConnectionStatus("Disconnected.");
        } else {
          setAccount(accounts[0]);
        }
      });
    }
  }, []);

  // ── Fetch baseURI from contract once provider is available ────────────────

  useEffect(() => {
    const fetchBaseURI = async () => {
      if (!provider) return;
      try {
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        const uri = await contract.baseURI();
        setBaseURI(uri);
      } catch (err) {
        console.warn("Could not fetch baseURI from contract:", err.message);
      }
    };
    fetchBaseURI();
  }, [provider]);

  // ── Fetch tokens for a given dataType (called by each asset page) ─────────

  const fetchTokensByType = useCallback(async (dataType) => {
    if (tokenCache[dataType]) return;

    setLoadingTypes((prev) => ({ ...prev, [dataType]: true }));
    setLoadError((prev)    => ({ ...prev, [dataType]: null }));

    const ids = manifest[dataType] || [];

    if (!baseURI) {
      setLoadError((prev) => ({
        ...prev,
        [dataType]: "Contract base URI not yet available. Please wait or reconnect your wallet.",
      }));
      setLoadingTypes((prev) => ({ ...prev, [dataType]: false }));
      return;
    }

    try {
      const results = await Promise.all(
        ids.map(async (id) => {
          const url = `${baseURI}${id}.json`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`Failed to fetch token ${id}: ${res.status}`);
          const json = await res.json();
          return { ...json, owner: false, count: "0" };
        })
      );

      setTokenCache((prev) => ({ ...prev, [dataType]: results }));

      // Immediately check balances for this type if wallet is connected
      // so the download button shows without requiring a page reload
      if (provider && account) {
        const contract    = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
        const updatedList = await Promise.all(
          results.map(async (assetToken) => {
            try {
              const balance = await contract.balanceOf(account, assetToken.id);
              return { ...assetToken, owner: balance > 0n, count: balance.toString() };
            } catch (err) {
              return assetToken;
            }
          })
        );
        setTokenCache((prev) => ({ ...prev, [dataType]: updatedList }));
        setBalancesLoaded(true);
      }
    } catch (err) {
      console.error(`Error fetching ${dataType} tokens:`, err);
      setLoadError((prev) => ({
        ...prev,
        [dataType]: `Could not load ${dataType} assets. Please try again.`,
      }));
    } finally {
      setLoadingTypes((prev) => ({ ...prev, [dataType]: false }));
    }
  }, [baseURI, tokenCache]);

  // ── Check on-chain balances for a set of token IDs ────────────────────────

  const checkBalances = useCallback(async (dataType) => {
    if (!provider || !account || !tokenCache[dataType]) return;

    const contract    = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
    const updatedList = await Promise.all(
      tokenCache[dataType].map(async (assetToken) => {
        try {
          const balance = await contract.balanceOf(account, assetToken.id);
          return { ...assetToken, owner: balance > 0n, count: balance.toString() };
        } catch (err) {
          console.warn(`balanceOf failed for token ${assetToken.id}:`, err.message);
          return assetToken;
        }
      })
    );

    setTokenCache((prev) => ({ ...prev, [dataType]: updatedList }));
    setBalancesLoaded(true);
  }, [provider, account, tokenCache]);

  // ── Re-check balances when account connects ───────────────────────────────

  useEffect(() => {
    if (provider && account) {
      Object.keys(tokenCache).forEach((dataType) => checkBalances(dataType));
    }
  }, [account, provider]);

  // ── Agreement toggle (local UI state only) ────────────────────────────────

  const toggleAgreement = (id) => {
    setHasAgreedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ── Mint (agree on-chain → mint on-chain) ─────────────────────────────────

  /**
   * Called when the user clicks "License this asset".
   * Flow:
   *  1. Ensure wallet is connected (prompt if not).
   *  2. Ensure the user is on Sepolia (chainId 11155111).
   *  3. Call agree(tokenId) on-chain.
   *  4. Call mint(tokenId, creator) on-chain — creator comes from the
   *     token's IPFS metadata already loaded in tokenCache.
   *  5. On success, mark mintStatus[tokenId] = "success" so the
   *     download button appears.
   */
  const licenseAsset = useCallback(async (assetToken) => {
    // 1. Connect wallet if not already connected
    let activeSigner = signer;
    if (!activeSigner || !account) {
      await initConnection();
      if (!window.ethereum) return;
      const tempProvider = new ethers.BrowserProvider(window.ethereum);
      activeSigner = await tempProvider.getSigner();
      setSigner(activeSigner);
    }

    // 2. Confirm user is on Sepolia (chainId 11155111)
    const network = await activeSigner.provider.getNetwork();
    if (network.chainId !== 11155111n) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
        const tempProvider = new ethers.BrowserProvider(window.ethereum);
        activeSigner = await tempProvider.getSigner();
        setSigner(activeSigner);
      } catch (switchError) {
        setMintError((prev) => ({
          ...prev,
          [assetToken.id]: "Please switch your wallet to the Sepolia test network.",
        }));
        return;
      }
    }

    const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, activeSigner);

    setMintStatus((prev) => ({ ...prev, [assetToken.id]: "pending" }));
    setMintError((prev)  => ({ ...prev, [assetToken.id]: null }));

    try {
      // 3. Record agreement on-chain
      const agreeTx = await contract.agree(assetToken.id);
      await agreeTx.wait();

      // 4. Mint the license token — pass title, creator, and license from IPFS metadata
      const mintTx = await contract.mint(assetToken.id, assetToken.name, assetToken.creator, assetToken.license);
      const receipt = await mintTx.wait();

      console.log("CCassetLicensed tx receipt:", receipt);

      // 5. Mark success → shows download button
      setMintStatus((prev) => ({ ...prev, [assetToken.id]: "success" }));

      // Refresh balances for this token's type
      checkBalances(assetToken.dataType);
    } catch (err) {
      console.error("Mint error:", err);
      const msg =
        err?.reason ||
        err?.data?.message ||
        err?.message ||
        "Transaction failed. Please try again.";
      setMintStatus((prev) => ({ ...prev, [assetToken.id]: "error" }));
      setMintError((prev)  => ({ ...prev, [assetToken.id]: msg }));
    }
  }, [signer, account, initConnection, checkBalances]);

  // ── Download helper ───────────────────────────────────────────────────────

  const getDownloadUrl = (assetToken) => {
    return `https://ipfs.io/ipfs/${assetToken.CID}`;
  };

  // ── Total asset count across all types in manifest ────────────────────────

  const totalAssetCount = Object.values(manifest).reduce(
    (sum, ids) => sum + ids.length, 0
  );

  // ── Expose API ─────────────────────────────────────────────────────────────

  return {
    account,
    baseURI,
    connectionStatus,
    initConnection,
    hasAgreedIds,
    toggleAgreement,
    licenseAsset,
    mintStatus,
    mintError,
    getDownloadUrl,
    fetchTokensByType,
    tokenCache,
    loadingTypes,
    loadError,
    totalAssetCount,
    balancesLoaded,
  };
};

export default ContractLogic;
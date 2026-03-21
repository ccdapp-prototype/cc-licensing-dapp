import { useEffect, useState } from 'react';
import './App.css';
import { ethers } from 'ethers';
import abi from './abi/abi.json';

// ─── Loaded from environment variables ───────────────────────────────────────
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
const RPC_URL          = process.env.REACT_APP_RPC_URL;
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URI = "https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/";

function Ledger() {
  const [events, setEvents]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

        const DEPLOY_BLOCK = 10475874;
        const filter = contract.filters.CCassetLicensed();
        const logs   = await contract.queryFilter(filter, DEPLOY_BLOCK, "latest");

        const logsWithTimestamps = await Promise.all(
          logs.map(async (log) => {
            const tokenId = log.args.tokenId.toString();

            const [block, metadataRes] = await Promise.all([
              provider.getBlock(log.blockNumber),
              fetch(`${BASE_URI}${tokenId}.json`).catch(() => null),
            ]);

            let licenseLink = null;
            if (metadataRes && metadataRes.ok) {
              const metadata = await metadataRes.json();
              licenseLink = metadata.licenseLink || null;
            }

            const date = new Date(block.timestamp * 1000);
            const formatted = date.toLocaleString("en-US", {
              year:   "numeric",
              month:  "short",
              day:    "numeric",
              hour:   "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: false,
            });

            return {
              txHash:      log.transactionHash,
              block:       log.blockNumber,
              timestamp:   formatted,
              licensee:    log.args.licensee,
              tokenId:     tokenId,
              title:       log.args.title,
              creator:     log.args.creator,
              license:     log.args.license,
              licenseLink: licenseLink,
              agreement:   log.args.agreement,
            };
          })
        );

        setEvents(logsWithTimestamps);
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Could not load licensing events. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // ── Filter events by search query across all fields ───────────────────────
  const filteredEvents = [...events]
    .sort((a, b) => newestFirst ? b.block - a.block : a.block - b.block)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.tokenId.toLowerCase().includes(q)       ||
        e.title.toLowerCase().includes(q)          ||
        e.creator.toLowerCase().includes(q)        ||
        e.license.toLowerCase().includes(q)        ||
        e.licensee.toLowerCase().includes(q)       ||
        e.timestamp.toLowerCase().includes(q)      ||
        e.block.toString().includes(q)             ||
        e.txHash.toLowerCase().includes(q)         ||
        (e.agreement ? "agreed" : "no").includes(q)
      );
    });

  return (
    <div className="page">
      <h2>CC Asset Licensing Ledger</h2>
      <p style={{ textAlign: "center", fontSize: "13px", color: "#eee", marginTop: "6px", marginBottom: "16px" }}>
        All licensing events recorded on the Sepolia blockchain.
      </p>

      <div style={{ overflowX: "auto", padding: "0 16px 24px 16px" }}>
        {isLoading && (
          <p style={{ textAlign: "center", color: "#aaa", marginTop: "40px" }}>
            Loading events from the blockchain...
          </p>
        )}

        {error && (
          <p style={{ textAlign: "center", color: "#ff6b6b", marginTop: "40px" }}>
            {error}
          </p>
        )}

        {!isLoading && !error && events.length === 0 && (
          <p style={{ textAlign: "center", color: "#aaa", marginTop: "40px" }}>
            No licensing events found yet.
          </p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <>
            {/* ── Controls row: search left, count + sort right ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "12px", flexWrap: "wrap" }}>

              {/* Search box */}
              <input
                type="text"
                className="ledgerSearch"
                placeholder="Search by title, creator, license, wallet, block..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: "1",
                  minWidth: "200px",
                  maxWidth: "480px",
                  padding: "6px 12px",
                  borderRadius: "4px",
                  border: "1px solid rgba(255,255,255,0.3)",
                  background: "rgba(255,255,255,0.15)",
                  color: "white",
                  fontSize: "13px",
                  outline: "none",
                }}
              />

              {/* Count + sort */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <p style={{ fontSize: "12px", color: "black", whiteSpace: "nowrap" }}>
                  {filteredEvents.length} of {events.length} event{events.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => setNewestFirst((prev) => !prev)}
                  style={{
                    background: "rgba(255,255,255,0.15)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    borderRadius: "4px",
                    color: "white",
                    padding: "5px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  Sort: {newestFirst ? "Newest first ↓" : "Oldest first ↑"}
                </button>
              </div>
            </div>

            {/* ── Table ── */}
            <table style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "13px",
              backgroundColor: "rgba(0,0,0,0.25)",
              borderRadius: "8px",
              overflow: "hidden",
            }}>
              <thead>
                <tr style={{ backgroundColor: "rgba(0,0,0,0.4)", textAlign: "left" }}>
                  <th style={thStyle}>Block</th>
                  <th style={thStyle}>Date / Time</th>
                  <th style={thStyle}>Asset ID</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Creator Attributed</th>
                  <th style={thStyle}>License</th>
                  <th style={thStyle}>Agreement</th>
                  <th style={thStyle}>Licensee Wallet</th>
                  <th style={thStyle}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#aaa", padding: "20px" }}>
                      No results match your search.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((e, index) => (
                    <tr
                      key={index}
                      style={{
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                        backgroundColor: index % 2 === 0 ? "rgba(255,255,255,0.05)" : "transparent",
                      }}
                    >
                      <td style={tdStyle}>{e.block}</td>
                      <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>{e.timestamp}</td>
                      <td style={tdStyle}>{e.tokenId}</td>
                      <td style={tdStyle}>{e.title}</td>
                      <td style={tdStyle}>{e.creator}</td>
                      <td style={tdStyle}>
                        {e.licenseLink ? (
                          <a
                            href={e.licenseLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#88c8ff" }}
                          >
                            {e.license}
                          </a>
                        ) : (
                          e.license
                        )}
                      </td>
                      <td style={{ ...tdStyle, color: e.agreement ? "#88f879" : "#ff6b6b" }}>
                        {e.agreement ? "✓ Agreed" : "✗ No"}
                      </td>
                      <td style={tdStyle}>
                        <span title={e.licensee}>
                          ...{e.licensee.substring(e.licensee.length - 8)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <a
                          href={`https://sepolia.etherscan.io/tx/${e.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: "#88c8ff" }}
                        >
                          View ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle = {
  padding: "10px 14px",
  fontWeight: "bold",
  color: "white",
  whiteSpace: "nowrap",
};

const tdStyle = {
  padding: "8px 14px",
  color: "white",
  verticalAlign: "top",
  maxWidth: "200px",
  wordBreak: "break-word",
};

export default Ledger;
import { useEffect, useState } from 'react';
import './App.css';
import { ethers } from 'ethers';
import abi from './abi/abi.json';

// ─── Contract address from environment variable ───────────────────────────────
const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS;
// ─────────────────────────────────────────────────────────────────────────────

// PublicNode is used here instead of Infura because the ledger makes many
// read-only getBlock() calls which exceed Infura's free tier rate limits.
const RPC_URL  = "https://ethereum-sepolia-rpc.publicnode.com";
const BASE_URI = "https://ipfs.io/ipfs/bafybeiabqeblsdpdh5pcnl5frctsbhisgfwm3wncqwrublixaw3fo4jczu/";

const PAGE_SIZE  = 20;
const BATCH_SIZE = 5;

function Ledger() {
  const [events, setEvents]           = useState([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [error, setError]             = useState(null);
  const [newestFirst, setNewestFirst] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const provider = new ethers.JsonRpcProvider(RPC_URL);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

        const DEPLOY_BLOCK = 10475875;
        const filter = contract.filters.CCassetLicensed();
        const logs   = await contract.queryFilter(filter, DEPLOY_BLOCK, "latest");

        // Step 1: Fetch exact block timestamps in small batches.
        // PublicNode handles high-volume read-only requests without rate limiting.
        const uniqueBlockNumbers = [...new Set(logs.map(l => l.blockNumber))];
        const blockTimestampMap  = {};

        for (let i = 0; i < uniqueBlockNumbers.length; i += BATCH_SIZE) {
          const batch = uniqueBlockNumbers.slice(i, i + BATCH_SIZE);
          await Promise.all(
            batch.map(async (blockNumber) => {
              const block = await provider.getBlock(blockNumber);
              const date  = new Date(block.timestamp * 1000);
              blockTimestampMap[blockNumber] = date.toLocaleString("en-US", {
                year:     "numeric",
                month:    "short",
                day:      "numeric",
                hour:     "2-digit",
                minute:   "2-digit",
                second:   "2-digit",
                hour12:   false,
                timeZone: "UTC",
              }) + " UTC";
            })
          );
        }

        // Map exact timestamps back to each log event
        const logsWithTimestamps = logs.map((log) => ({
          txHash:      log.transactionHash,
          block:       log.blockNumber,
          timestamp:   blockTimestampMap[log.blockNumber] || "",
          licensee:    log.args.licensee,
          tokenId:     log.args.tokenId.toString(),
          title:       log.args.title,
          creator:     log.args.creator,
          license:     log.args.license,
          licenseLink: null,
          agreement:   log.args.agreement,
        }));

        // Show the table immediately with exact timestamps
        setEvents(logsWithTimestamps);

        // Step 2: Fetch licenseLinks from IPFS in small batches in the background.
        // Runs after the table is visible so IPFS slowness won't block loading.
        const enriched = [...logsWithTimestamps];
        for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
          const batch = enriched.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.all(
            batch.map(async (event) => {
              try {
                const res = await fetch(`${BASE_URI}${event.tokenId}.json`);
                if (res.ok) {
                  const metadata = await res.json();
                  return { ...event, licenseLink: metadata.licenseLink || null };
                }
              } catch {
                // silently ignore IPFS failures — license text still shows
              }
              return event;
            })
          );
          batchResults.forEach((result, idx) => { enriched[i + idx] = result; });
          setEvents([...enriched]);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
        setError("Could not load licensing events. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // ── Filter and sort events ─────────────────────────────────────────────────
  const filteredEvents = [...events]
    .sort((a, b) => newestFirst ? b.block - a.block : a.block - b.block)
    .filter((e) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        e.tokenId.toLowerCase().includes(q)        ||
        e.title.toLowerCase().includes(q)           ||
        e.creator.toLowerCase().includes(q)         ||
        e.license.toLowerCase().includes(q)         ||
        e.licensee.toLowerCase().includes(q)        ||
        e.timestamp.toLowerCase().includes(q)       ||
        e.block.toString().includes(q)              ||
        e.txHash.toLowerCase().includes(q)          ||
        (e.agreement ? "agreed" : "no").includes(q)
      );
    });

  // ── Pagination ─────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / PAGE_SIZE));
  const safePage   = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * PAGE_SIZE;
  const pageEvents = filteredEvents.slice(startIndex, startIndex + PAGE_SIZE);

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  return (
    <div className="page">
      <h2>CC Asset Licensing Ledger</h2>
      <p style={{ textAlign: "center", color: "#eee", marginTop: "6px", marginBottom: "16px" }}>
        All licensing events created via this dApp, recorded on the Sepolia blockchain.
      </p>

      <div style={{ overflowX: "auto", padding: "0 16px 24px 16px" }}>
        {isLoading && (
          <p style={{ textAlign: "center", color: "#e9e8e8ff", marginTop: "40px" }}>
            Loading events from the blockchain...
          </p>
        )}

        {error && (
          <p style={{ textAlign: "center", color: "#fcdbdbff", marginTop: "40px" }}>
            {error}
          </p>
        )}

        {!isLoading && !error && events.length === 0 && (
          <p style={{ textAlign: "center", color: "#e9e8e8ff", marginTop: "40px" }}>
            No licensing events found yet.
          </p>
        )}

        {!isLoading && !error && events.length > 0 && (
          <>
            {/* ── Controls row: search left, count + sort right ── */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px", gap: "12px", flexWrap: "wrap" }}>
              <input
                type="text"
                className="ledgerSearch"
                placeholder="Search by title, creator, license, wallet, block..."
                value={searchQuery}
                onChange={handleSearch}
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
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <p style={{ fontSize: "12px", color: "black", whiteSpace: "nowrap" }}>
                  {filteredEvents.length} of {events.length} event{events.length !== 1 ? "s" : ""}
                </p>
                <button
                  onClick={() => { setNewestFirst((prev) => !prev); setCurrentPage(1); }}
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
                  <th style={thStyle}>Date / Time (UTC)</th>
                  <th style={thStyle}>Asset ID</th>
                  <th style={thStyle}>Title</th>
                  <th style={thStyle}>Creator Attributed</th>
                  <th style={thStyle}>License</th>
                  <th style={thStyle}>Agreement</th>
                  <th style={thStyle}>Licensee Wallet ID</th>
                  <th style={thStyle}>Tx</th>
                </tr>
              </thead>
              <tbody>
                {pageEvents.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#aaa", padding: "20px" }}>
                      No results match your search.
                    </td>
                  </tr>
                ) : (
                  pageEvents.map((e, index) => (
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
                          <a href={e.licenseLink} target="_blank" rel="noopener noreferrer" style={{ color: "#88c8ff" }}>
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
                        <a href={`https://sepolia.etherscan.io/tx/${e.txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: "#88c8ff" }}>
                          View ↗
                        </a>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* ── Pagination controls ── */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginTop: "16px", flexWrap: "wrap" }}>
                <button onClick={() => goToPage(1)} disabled={safePage === 1} style={paginationButtonStyle(safePage === 1)}>«</button>
                <button onClick={() => goToPage(safePage - 1)} disabled={safePage === 1} style={paginationButtonStyle(safePage === 1)}>‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === "..." ? (
                      <span key={`ellipsis-${idx}`} style={{ color: "white", padding: "0 4px" }}>…</span>
                    ) : (
                      <button key={item} onClick={() => goToPage(item)} style={paginationButtonStyle(false, item === safePage)}>
                        {item}
                      </button>
                    )
                  )
                }

                <button onClick={() => goToPage(safePage + 1)} disabled={safePage === totalPages} style={paginationButtonStyle(safePage === totalPages)}>›</button>
                <button onClick={() => goToPage(totalPages)} disabled={safePage === totalPages} style={paginationButtonStyle(safePage === totalPages)}>»</button>

                <span style={{ color: "white", fontSize: "12px", marginLeft: "8px" }}>
                  Page {safePage} of {totalPages} &nbsp;·&nbsp; showing {startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredEvents.length)} of {filteredEvents.length}
                </span>
              </div>
            )}
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

const paginationButtonStyle = (disabled, isActive = false) => ({
  background: isActive ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.15)",
  border: "1px solid rgba(255,255,255,0.3)",
  borderRadius: "4px",
  color: disabled ? "rgba(255,255,255,0.3)" : "white",
  padding: "4px 10px",
  cursor: disabled ? "not-allowed" : "pointer",
  fontSize: "13px",
  fontWeight: isActive ? "bold" : "normal",
});

export default Ledger;
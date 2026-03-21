import React from "react";

/**
 * AssetCard
 * Shared card component used by Audio, Images, Video, and Documents pages.
 * Handles the full license flow: checkbox → License button → pending → success/error → download.
 */
const AssetCard = ({
  assetToken,
  hasAgreed,
  toggleAgreement,
  licenseAsset,
  mintStatus,
  mintError,
  getDownloadUrl,
  balancesLoaded,
}) => {
  const status = mintStatus[assetToken.id] || "idle";
  const error  = mintError[assetToken.id]  || null;

  // Use the image URL directly from the token's IPFS metadata JSON
  const previewSrc = assetToken.image || null;

  // If the user already owns this token (i.e. has previously licensed it),
  // treat it as successfully licensed regardless of current session state.
  // Only evaluate this once balances have been checked on-chain.
  const alreadyLicensed = balancesLoaded && assetToken.owner === true;

  return (
    <div className="card" style={{ height: "auto", paddingBottom: "16px" }}>

      {/* ── Token ID badge ── */}
      <p style={{ fontSize: "11px", color: "#0d1409ff", marginBottom: "6px" }}>
        Asset ID: {assetToken.id}
      </p>

      {/* ── Preview image ── */}
      {previewSrc ? (
        <img src={previewSrc} className="assetImage" alt={assetToken.name} />
      ) : (
        <div
          className="assetImage"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "#aaa",
            backgroundColor: "#222",
          }}
        >
          No preview
        </div>
      )}

      {/* ── Metadata ── */}
      <strong><p className="assetName" style={{color: "#0d1409ff"}}>Title: {assetToken.name}</p></strong>
      <p className="assetName">Creator: {assetToken.creator}</p>
      <p className="assetName">
        License:{" "}
        <a target="_blank" href={assetToken.licenseLink} rel="noopener noreferrer">
          {assetToken.license}
        </a>
      </p>
      {alreadyLicensed && (
        <p className="assetName" style={{ color: "#88f879ff", marginTop: "4px" }}>
          ✓ You have licensed this item
        </p>
      )}

      {/* ── Agreement checkbox — hidden if already licensed or successful ── */}
      {!alreadyLicensed && status !== "success" && (
        <p style={{ marginTop: "10px", fontSize: "13px", textAlign: "center" }}>
          <label>
            <input
              type="checkbox"
              checked={hasAgreed}
              onChange={() => toggleAgreement(assetToken.id)}
              style={{ marginRight: "6px" }}
            />
            I agree to abide by the terms of the asset's Creative Commons license.
          </label>
        </p>
      )}

      {/* ── License / pending / error states — hidden if already licensed ── */}
      {!alreadyLicensed && status === "idle" && hasAgreed && (
        <p style={{ marginTop: "8px" }}>
          <button
            className="licenseButton"
            onClick={() => licenseAsset(assetToken)}
          >
            License this asset
          </button>
        </p>
      )}

      {!alreadyLicensed && status === "pending" && (
        <p style={{ marginTop: "8px", fontSize: "13px", color: "#f0c040" }}>
          ⏳ Confirming transaction… please wait, then confirm both times in your wallet.
        </p>
      )}

      {!alreadyLicensed && status === "error" && (
        <>
          <p style={{ marginTop: "8px", fontSize: "12px", color: "#ff6b6b" }}>
            ✗ {error}
          </p>
          {hasAgreed && (
            <p style={{ marginTop: "6px" }}>
              <button
                className="licenseButton"
                onClick={() => licenseAsset(assetToken)}
              >
                Retry
              </button>
            </p>
          )}
        </>
      )}

      {/* ── Download button — shown if licensed this session OR previously ── */}
      {(alreadyLicensed || status === "success") && (
        <div style={{ marginTop: "10px", textAlign: "center" }}>
          {/* <p style={{ fontSize: "13px", color: "#6fcf6f", marginBottom: "8px" }}>
            ✓ Licensed successfully!
          </p> */}
          <a
            href={getDownloadUrl(assetToken)}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <button className="downloadButton">
              Download Asset
            </button>
          </a>
        </div>
      )}
    </div>
  );
};

export default AssetCard;
import { useEffect } from 'react';
import './App.css';
import { useContract } from "./components/ContractContext.js";
import AssetCard from "./components/AssetCard.js";

function Video() {
  const {
    baseURI,
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
    balancesLoaded,
  } = useContract();

  useEffect(() => {
    if (baseURI) fetchTokensByType("video");
  }, [baseURI]);

  const videoAssets = tokenCache["video"] || [];
  const isLoading   = loadingTypes["video"];
  const error       = loadError["video"];

  return (
    <div className="page">
      <h2>Video Assets ({videoAssets.length})</h2>
      <div className="main">
        {isLoading && <p style={{ color: "#aaa" }}>Loading video assets...</p>}
        {error     && <p style={{ color: "#ff6b6b" }}>{error}</p>}
        {!isLoading && !error && videoAssets.length === 0 && (
          <p style={{ color: "#aaa" }}>No video assets found.</p>
        )}
        {videoAssets.map((assetToken, index) => (
          <AssetCard
            key={`video-${assetToken.id}-${index}`}
            assetToken={assetToken}
            hasAgreed={hasAgreedIds.includes(assetToken.id)}
            toggleAgreement={toggleAgreement}
            licenseAsset={licenseAsset}
            mintStatus={mintStatus}
            mintError={mintError}
            getDownloadUrl={getDownloadUrl}
            balancesLoaded={balancesLoaded}
          />
        ))}
      </div>
    </div>
  );
}

export default Video;
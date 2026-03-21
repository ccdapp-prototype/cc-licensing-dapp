import { useEffect } from 'react';
import './App.css';
import { useContract } from "./components/ContractContext.js";
import AssetCard from "./components/AssetCard.js";

function Images() {
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
    if (baseURI) fetchTokensByType("image");
  }, [baseURI]);

  const imageAssets = tokenCache["image"] || [];
  const isLoading   = loadingTypes["image"];
  const error       = loadError["image"];

  return (
    <div className="page">
      <h2>Image Assets ({imageAssets.length})</h2>
      <div className="main">
        {isLoading && <p style={{ color: "#aaa" }}>Loading image assets...</p>}
        {error     && <p style={{ color: "#ff6b6b" }}>{error}</p>}
        {!isLoading && !error && imageAssets.length === 0 && (
          <p style={{ color: "#aaa" }}>No image assets found.</p>
        )}
        {imageAssets.map((assetToken, index) => (
          <AssetCard
            key={`image-${assetToken.id}-${index}`}
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

export default Images;
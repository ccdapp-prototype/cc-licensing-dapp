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
  }, [baseURI, fetchTokensByType]);

  const imageAssets = tokenCache["image"] || [];
  const isLoading   = loadingTypes["image"];
  const error       = loadError["image"];

  return (
    <div className="page">
      <h2>Image Assets ({imageAssets.length})</h2>
      <div className="main">
        {isLoading && <p style={{ color: "#e9e8e8ff" }}>Loading image assets...</p>}
        {error     && <p style={{ color: "#fcdbdbff" }}>{error}</p>}
        {!isLoading && !error && imageAssets.length === 0 && (
          <p style={{ color: "#e9e8e8ff" }}>No image assets found.</p>
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
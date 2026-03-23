import { useEffect } from 'react';
import './App.css';
import { useContract } from "./components/ContractContext.js";
import AssetCard from "./components/AssetCard.js";

function Audio() {
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
    if (baseURI) fetchTokensByType("audio");
  }, [baseURI, fetchTokensByType]);

  const audioAssets = tokenCache["audio"] || [];
  const isLoading   = loadingTypes["audio"];
  const error       = loadError["audio"];

  return (
    <div className="page">
      <h2>Audio Assets ({audioAssets.length})</h2>
      <div className="main">
        {isLoading && <p style={{ color: "#e9e8e8ff" }}>Loading audio assets...</p>}
        {error     && <p style={{ color: "#fcdbdbff" }}>{error}</p>}
        {!isLoading && !error && audioAssets.length === 0 && (
          <p style={{ color: "#e9e8e8ff" }}>No audio assets found.</p>
        )}
        {audioAssets.map((assetToken, index) => (
          <AssetCard
            key={`audio-${assetToken.id}-${index}`}
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

export default Audio;
import { useEffect } from 'react';
import './App.css';
import { useContract } from "./components/ContractContext.js";
import AssetCard from "./components/AssetCard.js";

function Documents() {
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
    if (baseURI) fetchTokensByType("document");
  }, [baseURI, fetchTokensByType]);

  const docAssets = tokenCache["document"] || [];
  const isLoading = loadingTypes["document"];
  const error     = loadError["document"];

  return (
    <div className="page">
      <h2>Document Assets ({docAssets.length})</h2>
      <div className="main">
        {isLoading && <p style={{ color: "#e9e8e8ff" }}>Loading document assets...</p>}
        {error     && <p style={{ color: "#fcdbdbff" }}>{error}</p>}
        {!isLoading && !error && docAssets.length === 0 && (
          <p style={{ color: "#e9e8e8ff" }}>No document assets found.</p>
        )}
        {docAssets.map((assetToken, index) => (
          <AssetCard
            key={`doc-${assetToken.id}-${index}`}
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

export default Documents;
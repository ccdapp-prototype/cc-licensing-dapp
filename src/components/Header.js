import { Link, useLocation } from "react-router-dom";
import './Header.css';
import { useContract } from "./ContractContext.js";

const Header = () => {
  const { account, totalAssetCount, connectionStatus, initConnection } = useContract();
  const location = useLocation();

  const linkClass = (path) =>
    location.pathname === path ? "header_active" : "header_link";

  return (
    <div className="header_container">
      <h1 style={{ fontSize: "18px", marginRight: "20px" }}>CC Licensing dApp</h1>

      <Link to="/"          className={linkClass("/")}>Home</Link>
      <Link to="/audio"     className={linkClass("/audio")}>Audio</Link>
      <Link to="/images"    className={linkClass("/images")}>Images</Link>
      <Link to="/video"     className={linkClass("/video")}>Video</Link>
      <Link to="/documents" className={linkClass("/documents")}>Documents</Link>
      <Link to="/ledger"    className={linkClass("/ledger")}>Ledger</Link>

      <p style={{ marginRight: "10px", fontSize: "14px" }}>
        Total CC Assets: ({totalAssetCount})
      </p>

      {account === "" ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <button onClick={initConnection} className="button">
            Connect Wallet
          </button>
          {connectionStatus !== "Disconnected" && (
            <span style={{ fontSize: "11px", color: "#aaa", marginTop: "3px" }}>
              {connectionStatus}
            </span>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <p style={{ fontSize: "13px", color: "#6fcf6f" }}>
            ● ...{account.substring(account.length - 7)}
          </p>
          <span style={{ fontSize: "11px", color: "#aaa" }}>{connectionStatus}</span>
        </div>
      )}
    </div>
  );
};

export default Header;
import './App.css';
import Header from "./components/Header.js";
import Audio from './audio.js';
import Images from './images.js';
import Video from './video.js';
import Documents from './documents.js';
import { Routes, Route } from 'react-router-dom';
import { ContractProvider } from './components/ContractContext.js';
import Ledger from './ledger.js';

function App() {
  return (
    <ContractProvider>
      <div className="page">
        <Header />
        <Routes>
          <Route path="/audio"     element={<Audio />}     />
          <Route path="/images"    element={<Images />}    />
          <Route path="/video"     element={<Video />}     />
          <Route path="/documents" element={<Documents />} />
          <Route path="/ledger"    element={<Ledger />}    />
          <Route
            path="/"
            element={
              <div style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: "20px",
              }}>
                <p>
                 <h1> Welcome to the Creative Commons Licensing dApp Prototype</h1><br />
                  <p>Connect your Web3 wallet and click an asset type above to browse
                  and license Creative Commons assets.</p>
                  <br />
                  <p>Use the Ledger page to search through information about licensed assets.</p>
                </p>
              </div>
            }
          />
        </Routes>
      </div>
    </ContractProvider>
  );
}

export default App;
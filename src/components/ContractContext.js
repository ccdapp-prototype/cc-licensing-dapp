import React, { createContext, useContext } from "react";
import ContractLogic from "./ContractLogic.js";

/**
 * ContractContext
 * ---------------
 * Wraps the entire app in a single shared instance of ContractLogic so
 * that all components (Header, Audio, Images, Video, Documents) read from
 * the same state. Without this, each component calling ContractLogic()
 * independently gets its own isolated state, meaning baseURI fetched in
 * one component is invisible to the others.
 */
const ContractContext = createContext(null);

export const ContractProvider = ({ children }) => {
  const contractLogic = ContractLogic();
  return (
    <ContractContext.Provider value={contractLogic}>
      {children}
    </ContractContext.Provider>
  );
};

export const useContract = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error("useContract must be used within a ContractProvider");
  }
  return context;
};

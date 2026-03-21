// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.2;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CCassetLicensing
 * @dev ERC1155 contract for Creative Commons asset licensing on Sepolia testnet.
 *      Each token ID corresponds to a CC-licensed asset. When a user agrees to
 *      the license terms and calls mint(), a token is minted to their wallet and
 *      the agreement is logged as a blockchain event including the asset title,
 *      creator, and CC license. All three strings are passed in from the frontend
 *      (read from IPFS metadata) rather than pre-stored on-chain.
 */
contract CCassetLicensing is ERC1155, Ownable {
    using Strings for uint256;

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    /// @notice Base IPFS URI for token metadata. Append {id}.json to get metadata.
    string public baseURI;

    /// @dev Tracks per-user, per-token agreement: hasAgreed[tokenId][userAddress]
    mapping(uint256 => mapping(address => bool)) public hasAgreed;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    /**
     * @notice Emitted when a user successfully licenses (mints) a CC asset.
     * @param licensee    The wallet address of the user who agreed and minted.
     * @param tokenId     The asset's token ID (matches the id field in metadata JSON).
     * @param title       The asset title read from the token's IPFS metadata.
     * @param creator     The creator string read from the token's IPFS metadata.
     * @param license     The CC license string read from the token's IPFS metadata.
     * @param agreement   Read directly from hasAgreed mapping; proven true by require() gate.
     */
    event CCassetLicensed(
        address indexed licensee,
        uint256 indexed tokenId,
        string title,
        string creator,
        string license,
        bool agreement
    );

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    /**
     * @param _baseURI  IPFS base URI, e.g. "https://ipfs.io/ipfs/<CID>/"
     *                  Token metadata will be fetched at baseURI + tokenId + ".json"
     */
    constructor(string memory _baseURI)
        ERC1155(_baseURI)
        Ownable(msg.sender)
    {
        baseURI = _baseURI;
    }

    // -----------------------------------------------------------------------
    // Owner-only setup
    // -----------------------------------------------------------------------

    /**
     * @notice Update the base metadata URI.
     */
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
        _setURI(_baseURI);
    }

    // -----------------------------------------------------------------------
    // User-facing: agree then mint
    // -----------------------------------------------------------------------

    /**
     * @notice Record the calling user's agreement to abide by the CC license
     *         for a given token ID. Must be called before mint() will succeed.
     * @param tokenId  The asset token ID the user is agreeing to license.
     */
    function agree(uint256 tokenId) external {
        hasAgreed[tokenId][msg.sender] = true;
    }

    /**
     * @notice Mint one license token to msg.sender, permanently logging the
     *         asset title, creator, CC license, and agreement on-chain via
     *         the CCassetLicensed event. All strings are supplied by the
     *         frontend from the token's IPFS metadata JSON.
     *
     *         Emits {CCassetLicensed}.
     *
     * @param tokenId  The asset token ID to mint (matches id in metadata JSON).
     * @param title    The asset title read from the token's IPFS metadata.
     * @param creator  The creator string read from the token's IPFS metadata.
     * @param license  The CC license string read from the token's IPFS metadata.
     */
    function mint(
        uint256 tokenId,
        string memory title,
        string memory creator,
        string memory license
    ) external {
        require(
            hasAgreed[tokenId][msg.sender],
            "CCassetLicensing: You must agree to the CC license terms before licensing this asset"
        );

        // Mint 1 token of tokenId to the caller
        _mint(msg.sender, tokenId, 1, "");

        // Log everything to the blockchain. agreement is read from storage
        // rather than hardcoded, making the relationship between the
        // hasAgreed mapping and this event explicit.
        emit CCassetLicensed(
            msg.sender,
            tokenId,
            title,
            creator,
            license,
            hasAgreed[tokenId][msg.sender]
        );
    }

    // -----------------------------------------------------------------------
    // Views
    // -----------------------------------------------------------------------

    /**
     * @notice Check whether a user has agreed to a specific token's license.
     */
    function checkAgreement(uint256 tokenId, address user) external view returns (bool) {
        return hasAgreed[tokenId][user];
    }

    /**
     * @notice Returns the metadata URI for a given token ID.
     *         Follows ERC1155 metadata standard: baseURI + tokenId + ".json"
     */
    function uri(uint256 tokenId) public view override returns (string memory) {
        return string(abi.encodePacked(baseURI, tokenId.toString(), ".json"));
    }
}

pragma solidity ^0.5.16;

import "./PriceOracleInterface.sol";
import "../ctoken/CErc20.sol";
import "@chainlink/contracts/src/v0.5/interfaces/AggregatorV3Interface.sol";

contract ChainLinkOracle is PriceOracle {
    mapping(address => AggregatorV3Interface) priceFeeds;
    event PricePosted(address asset, uint previousPriceMantissa, uint requestedPriceMantissa, uint newPriceMantissa);
    address admin;

    constructor() public {
        admin = msg.sender;
    }

    function isPriceOracle() external pure returns (bool) { return true; }

    function setAggregator(CToken cToken, AggregatorV3Interface aggregator) external {
        require(msg.sender == admin, "only admin can set aggregator");
        priceFeeds[address(cToken)] = aggregator;
    }

    function getUnderlyingPrice(CToken cToken) public view returns (uint) {
        (
        /*uint80 roundID*/,
        int price,
        /*uint startedAt*/,
        /*uint timeStamp*/,
        /*uint80 answeredInRound*/
        ) = priceFeeds[address(cToken)].latestRoundData();
        return uint(price);
    }
}
// SPDX-License-Identifier: agpl-3.0
pragma solidity ^0.6.6;

import "./FlashLoanReceiverBaseV2.sol";
import "./interfaces/ILendingPoolAddressesProviderV2.sol";
import "./interfaces/ILendingPoolV2.sol";
import "../utils/Withdrawable.sol";
import "./CTokenApdator.sol";
import "../WethInterface.sol";

contract FlashLoanV2 is FlashLoanReceiverBaseV2, Withdrawable {
    constructor(address _addressProvider)
        public
        FlashLoanReceiverBaseV2(_addressProvider)
    {}

    /**
     * @dev This function must be called only be the LENDING_POOL and takes care of repaying
     * active debt positions, migrating collateral and incurring new V2 debt token debt.
     *
     * @param assets The array of flash loaned assets used to repay debts.
     * @param amounts The array of flash loaned asset amounts used to repay debts.
     * @param premiums The array of premiums incurred as additional debts.
     * @param initiator The address that initiated the flash loan, unused.
     * @param params The byte array containing, in this case, the arrays of aTokens and aTokenAmounts.
     */
    function executeOperation(
        address[] calldata assets,
        uint256[] calldata amounts,
        uint256[] calldata premiums,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(assets.length == 1, "Require only one assets");
        require(assets[0] == address(0xd0A1E359811322d97991E03f863a0C30C2cF029C), "Not weth address");
        (address cEther, address borrower, address cWETH) = decodeParams(params);
        WethInterface weth = WethInterface(assets[0]);
        
        weth.withdraw(amounts[0]);
        CEtherInterface(cEther).liquidateBorrow{value: amounts[0]}(borrower, CTokenInterface(cWETH));

        uint256 amountOwing = amounts[0].add(premiums[0]);
        CTokenInterface(cWETH).redeemUnderlying(CTokenInterface(cWETH).balanceOfUnderlying(address(this)));
        IERC20(assets[0]).approve(address(LENDING_POOL), amountOwing);
        return true;
    }

    function _flashloan(
        address[] memory assets, 
        uint256[] memory amounts, 
        address borrower, 
        CTokenInterface cToken, 
        CTokenInterface collateral
    ) internal {
        bytes memory params = abi.encodePacked(cToken, borrower, collateral);
        uint16 referralCode = 0;

        uint256[] memory modes = new uint256[](assets.length);

        // 0 = no debt (flash), 1 = stable, 2 = variable
        for (uint256 i = 0; i < assets.length; i++) {
            modes[i] = 0;
        }

        LENDING_POOL.flashLoan(
            address(this),
            assets,
            amounts,
            modes,
            address(this),
            params,
            referralCode
        );
    }

  
    function flashloan(
        address _asset, 
        uint256 amount, 
        address borrower,
        CTokenInterface cToken,
        CTokenInterface collateral
    ) public onlyOwner {
        bytes memory data = "";

        address[] memory assets = new address[](1);
        assets[0] = _asset;

        uint256[] memory amounts = new uint256[](1);
        amounts[0] = amount;

        _flashloan(assets, amounts, borrower, cToken, collateral);
    }

    function decodeParams(bytes memory bys) private pure returns (
        address cToken, address borrower, address collateral) {
        assembly {
            cToken := mload(add(bys,20))
            borrower := mload(add(add(bys,20), 20))
            collateral := mload(add(add(bys,20), 40))
        } 
        return (cToken, borrower, collateral);
    }
}
pragma solidity ^0.6.6;


interface CTokenInterface{

    function liquidateBorrow(address borrower, uint repayAmount, CTokenInterface cTokenCollateral) external returns (uint);
    function redeemUnderlying(uint redeemAmount) external returns (uint);

    /*** User Interface ***/

    // ERC20
    function transfer(address dst, uint amount) external returns (bool);
    function transferFrom(address src, address dst, uint amount) external returns (bool);
    function approve(address spender, uint amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint);
    function balanceOf(address owner) external view returns (uint);
    function balanceOfUnderlying(address owner) external returns (uint);
}

interface CEtherInterface{
    function liquidateBorrow(address borrower, CTokenInterface cTokenCollateral) external payable;
}
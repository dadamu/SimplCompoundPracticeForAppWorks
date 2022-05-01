pragma solidity ^0.6.6;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestCoin is ERC20 {
    constructor(uint256 initialSupply) ERC20("TestToken", "CTT") public {
        _mint(msg.sender, initialSupply);
    }
}
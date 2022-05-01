const hre = require("hardhat");
const utils = require("./utils");

async function main() {
  await hre.run("compile");
  const [admin, borrower] = await ethers.getSigners();
  console.log("Admin:", admin.address);
  console.log("Borrower:", borrower.address);

  const WETHAddr = "0xd0A1E359811322d97991E03f863a0C30C2cF029C";
  const [comptroller, oracle, cEther,,, cWETH] = await utils.deployAndSetComptroller(admin, WETHAddr);

  const wetherPrice = await oracle.getUnderlyingPrice(cWETH.address);
  console.log("WETH price:", wetherPrice.toString());
  const etherPrice = await oracle.getUnderlyingPrice(cEther.address);
  console.log("Ether price:", etherPrice.toString());

  // Deploy flash loan
  const provider = "0x88757f2f99175387aB4C6a4b3067c77A695b0349";
  const flashLoan = await utils.deploy("FlashLoanV2", provider);
  console.log("FlashLoan deployed to:", flashLoan.address);

  await supplyAndBorrow(admin, borrower, comptroller, WETHAddr, cWETH, cEther);

  console.log("Set ether oracle price to be 1/3");
  await oracle.setUnderlyingPrice(cWETH.address, ethers.utils.parseUnits("0.3", 18));

  tx = await flashLoan.flashloan(WETHAddr, ethers.utils.parseUnits("0.3", 18), borrower.address, cEther.address, cWETH.address);

  const WETH = await utils.attach("WethInterface", WETHAddr);
  const earning = await WETH.balanceOf(flashLoan.address);
  console.log("Flash Loan earning:", earning.toString());
}

async function supplyAndBorrow(admin, borrower, comptroller, WETHAddr, cWETH, cEther) {
  // borrower wrapped eth
  const WETH = await utils.attach("WethInterface", WETHAddr);
  await WETH.connect(borrower).fallback({value: ethers.utils.parseEther("1")});
  
  // Both admin and borrower joining markets are required
  await comptroller.connect(borrower).enterMarkets([cWETH.address, cEther.address]);
  await comptroller.connect(admin).enterMarkets([cWETH.address, cEther.address]);
  
  // Borrower supplies WETH
  await WETH.connect(borrower).approve(cWETH.address, ethers.utils.parseEther("1"));
  let tx = await cWETH.connect(borrower).mint(ethers.utils.parseUnits("1", 18));
  await utils.checkCompoundFailure(tx);
  balance = await cWETH.balanceOf(borrower.address);
  console.log("Borrower supplied cWETH balance", balance.toString());

  // Admin supplies ether
  tx = await cEther.mint({ value: ethers.utils.parseUnits("100", 18) });
  await utils.checkCompoundFailure(tx);

  balance = await cEther.balanceOf(admin.address);
  console.log("Admin supplied cEther balance", balance.toString());

  let l = await comptroller.getAccountLiquidity(borrower.address)
  console.log("liquidity before borrowing:", l[1].toString());
  tx = await cEther.connect(borrower).borrow(ethers.utils.parseUnits("0.6", 18));
  await utils.checkCompoundFailure(tx);

  l = await comptroller.getAccountLiquidity(borrower.address);
  console.log("liquidity after borrowing:", l[1].toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 

const hre = require("hardhat");
const utils = require("./utils");

async function main() {
  await hre.run("compile");

  const [admin, borrower] = await ethers.getSigners();
  console.log("Admin:", admin.address);
  console.log("Borrower:", borrower.address);

  const [comptroller, oracle, cEther, testCoin, cTestCoin] = await utils.deployAndSetComptroller(admin, "");

  const etherPrice = await oracle.getUnderlyingPrice(cEther.address);
  console.log("Ether price:", etherPrice.toString());
  const testCoinPrice = await oracle.getUnderlyingPrice(cTestCoin.address);
  console.log("TestCoin price:", testCoinPrice.toString());
  
  // Both admin and borrower joining markets are required
  await comptroller.connect(borrower).enterMarkets([cEther.address, cTestCoin.address]);
  await comptroller.connect(admin).enterMarkets([cEther.address, cTestCoin.address]);

  await cEther.connect(borrower).mint({ value: ethers.utils.parseUnits("10", 18) });
  balance = await cEther.balanceOf(borrower.address);
  console.log("Borrower supplied cEther balance", balance.toString());
    
  await testCoin.approve(cTestCoin.address, ethers.utils.parseUnits("1000", 18));
  await cTestCoin.mint(ethers.utils.parseUnits("100", 18));
  balance = await cTestCoin.balanceOf(admin.address);
  console.log("cTestCoin balance", balance.toString());

  balance = await testCoin.balanceOf(borrower.address);
  console.log("TestCoin balance of the borrower before borrowing", balance.toString());
  await cTestCoin.connect(borrower).borrow(ethers.utils.parseUnits("6", 18));

  balance = await testCoin.balanceOf(borrower.address);
  console.log("TestCoin balance of the borrower after borrowing", balance.toString());

  console.log("Set ether oracle price to be 1/2");
  await oracle.setUnderlyingPrice(cEther.address, ethers.utils.parseUnits("0.5", 18));

  balance = await cEther.balanceOf(admin.address);
  console.log("Liquidator balance before liquidating:", balance);
  await cTestCoin.connect(admin).liquidateBorrow(borrower.address, ethers.utils.parseUnits("3", 18), cEther.address);
  balance = await cEther.balanceOf(admin.address);
  console.log("Liquidator balance after liquidating:", balance);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you"ll find the Hardhat
// Runtime Environment"s members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run("compile");

  const [admin, borrower] = await ethers.getSigners();
  console.log("Admin:", admin.address);
  console.log("Borrower:", borrower.address);

  const comptroller = await deployComptroller();
  console.log("Comptroller deployed to:", comptroller.address);

  const interestRateModel = await deployInterestRateModel();
  console.log(`InterestRateModel deployed to: ${interestRateModel.address}`);

  const oracle = await deployOracle();
  console.log("Oracle deployed to:", oracle.address);

  console.log("Setting PriceOracle");
  await comptroller._setPriceOracle(oracle.address);

  // Set CEther
  console.log("Deploying CEther");
  const cEther = await deployCEther(comptroller, interestRateModel, admin);
  console.log("CEther deployed to:", cEther.address);


  // Set TestCoin
  const testCoin = await deployTestCoin();
  console.log("TestCoin deployed to:", testCoin.address);
  const cTestCoin = await deployCTestCoin(testCoin, comptroller, interestRateModel);
  console.log("cTestCoin deployed to:", cTestCoin.address);


  console.log("Setting oracle prices");
  await oracle.setUnderlyingPrice(cEther.address, ethers.utils.parseUnits("1", 18));
  await oracle.setUnderlyingPrice(cTestCoin.address,  ethers.utils.parseUnits("1", 18));
  await setComptroller(comptroller, cEther, cTestCoin);

  const etherPrice = await oracle.getUnderlyingPrice(cEther.address);
  console.log("Ether price:", etherPrice.toString());
  const testCoinPrice = await oracle.getUnderlyingPrice(cTestCoin.address);
  console.log("TestCoin price:", testCoinPrice.toString());

  await cEther.connect(borrower).mint({ value: 1000 });
  balance = await cEther.balanceOf(borrower.address);
  console.log("Borrower supplied cEther balance", balance.toString());

    
  console.log("Admin Supply cTestCoin");
  await testCoin.approve(cTestCoin.address, ethers.utils.parseUnits("100", 6));
  tx = await cTestCoin.mint(ethers.utils.parseUnits("100", 6));
  balance = await cTestCoin.balanceOf(admin.address);
  console.log("cTestCoin balance", balance.toString());

  liquidity = await comptroller.getAccountLiquidity(borrower.address)
  console.log("Borrower liquidity:", liquidity);

  balance = await testCoin.balanceOf(borrower.address);
  console.log("TestCoin balance of the borrower before borrowing", balance.toString());
  const borrowTx = await cTestCoin.connect(borrower).borrow(ethers.utils.parseUnits("1", 10));
  await checkFailure(borrowTx);

  balance = await testCoin.balanceOf(borrower.address);
  console.log("TestCoin balance of the borrower after borrowing", balance.toString());


  console.log("Set cEther oracle price to be 1/100");
  await oracle.setUnderlyingPrice(cEther.address, 1);
}

async function deployComptroller() {
  const Comptroller = await ethers.getContractFactory("Comptroller");
  const comptroller = await Comptroller.deploy();
  await comptroller.deployed();
  return comptroller
}

async function deployInterestRateModel() {
  const InterestRateModel = await ethers.getContractFactory("JumpRateModel");
  const interestRateModel = await InterestRateModel.deploy(0, 0, 0, 0);
  await interestRateModel.deployed();
  return interestRateModel; 
}

async function deployOracle() {
  const Oracle = await ethers.getContractFactory("SimplePriceOracle");
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  return oracle;
}

async function deployCEther(comptroller, interestRateModel, admin) {
  const CEther = await ethers.getContractFactory("CEther");
  const cEther = await CEther.deploy(
        comptroller.address,
        interestRateModel.address, 
        "1",
        "CEther",
        "cETH",
        8,
        admin.address
    );
  await cEther.deployed();
  return cEther;
}

async function deployTestCoin() {
  const TestCoin = await ethers.getContractFactory("TestCoin");
  const testCoin = await TestCoin.deploy(ethers.utils.parseEther("10000"));
  await testCoin.deployed();
  return testCoin
}

async function deployCTestCoin(testCoin, comptroller, interestRateModel) {
  const CErc20 = await ethers.getContractFactory("CErc20");
  const cTestCoin = await CErc20.deploy(
    testCoin.address,
    comptroller.address,
    interestRateModel.address,
    "1",
    "CTestToken", 
    "CTT", 
    8
  );
  await cTestCoin.deployed();
  return cTestCoin
}

async function setComptroller(comptroller, cEther, cTestCoin) {
  await comptroller._supportMarket(cTestCoin.address);
  await comptroller._supportMarket(cEther.address);
  await comptroller._setCollateralFactor(cTestCoin.address,  ethers.utils.parseUnits("0.75", 18));
  await comptroller._setCollateralFactor(cEther.address,  ethers.utils.parseUnits("0.75", 18));
  await comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18));
  await comptroller.enterMarkets([cEther.address, cTestCoin.address]);
}

async function checkFailure(tx) {
  let txResult = await tx.wait()
  let failure = txResult.events.find(_ => _.event === 'Failure');
  if (failure) {
    const errorCode = failure.args.error;
    throw new Error(
      `See https://compound.finance/docs/ctokens#ctoken-error-codes\n` +
      `Code: ${errorCode}\n`
    );
  }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

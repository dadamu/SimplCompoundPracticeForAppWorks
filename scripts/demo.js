// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require("hardhat");

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  await hre.run('compile');

  const admin = (await ethers.getSigners())[0];

  console.log('Deploying Comptroller');
  const Comptroller = await ethers.getContractFactory('Comptroller');
  const comptroller = await Comptroller.deploy();
  await comptroller.deployed();
  console.log("Comptroller deployed to:", comptroller.address);

  console.log('Deploying InterestRateModel');
  const InterestRateModel = await ethers.getContractFactory('JumpRateModel');
  const interestRateModel = await InterestRateModel.deploy(1, 1, 1, 1);
  await interestRateModel.deployed();
  console.log(`InterestRateModel deployed to: ${interestRateModel.address}`) 

  console.log('Deploying Oracle');
  const Oracle = await ethers.getContractFactory('SimplePriceOracle');
  const oracle = await Oracle.deploy();
  await oracle.deployed();
  console.log('Oracle deployed to:', oracle.address);

  console.log('Setting PriceOracle');
  await comptroller._setPriceOracle(oracle.address);

  // Set CEther

  console.log('Deploying CEther');
  const CEther = await ethers.getContractFactory('CEther');
  const cEther = await CEther.deploy(
        comptroller.address,
        interestRateModel.address, 
        '1',
        'CEther',
        'cETH',
        18,
        admin.address
    );
  await cEther.deployed();
  console.log('CEther deployed to:', cEther.address);

  console.log('Setting cEther oracle price');
  await oracle.setUnderlyingPrice(cEther.address, 100)
  console.log('Set cEther oracle price');

  console.log('Adding CEther into market')
  await comptroller._supportMarket(cEther.address);
  await comptroller._setCollateralFactor(cEther.address,  ethers.utils.parseEther("10"));

  // Set TestCoin
  console.log('Deploying TestCoin');
  const TestCoin = await ethers.getContractFactory('TestCoin');
  const testCoin = await TestCoin.deploy(ethers.utils.parseEther("10"));
  await testCoin.deployed();
  console.log('TestCoin deployed to:', testCoin.address);

  console.log('Deploying CTestCoin');
  const CErc20 = await ethers.getContractFactory('CErc20');
  const cTestCoin = await CErc20.deploy(
    testCoin.address,
    comptroller.address,
    interestRateModel.address,
    '1',
    "CTestToken", 
    "CTT", 
    8
  );
  await cTestCoin.deployed();
  console.log('cTestCoin deployed to:', cTestCoin.address);
  
  console.log('Setting cTestCOin oracle price');
  await oracle.setUnderlyingPrice(cTestCoin.address, 100)
  console.log('Set cTestCoin oracle price');

  console.log('Adding cTestCoin into market')
  await comptroller._supportMarket(cTestCoin.address);
  await comptroller._setCollateralFactor(cTestCoin.address,  ethers.utils.parseEther("1"));


  // Enter markets
  await comptroller.enterMarkets([cEther.address, cTestCoin.address]);


  console.log('Supply cEther');
  await cEther.mint({ value:  ethers.utils.parseEther("1") });

  balance = await cEther.balanceOf(admin.address);
  console.log('cEther balance', balance.toString());

    
  console.log('Supply cTestCoin');
  await testCoin.approve(cTestCoin.address, ethers.utils.parseEther("10"));
  await cTestCoin.mint(1000);
  balance = await cTestCoin.balanceOf(admin.address);
  console.log('cTestCoin balance', balance.toString());

  balance = await testCoin.balanceOf(admin.address);
  console.log('TestCoin balance before borrowing', balance.toString());
  await cTestCoin.borrow(1000);
  balance = await testCoin.balanceOf(admin.address);
  console.log('TestCoin balance after borrowing', balance.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

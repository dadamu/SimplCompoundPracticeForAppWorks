const { ethers } = require("hardhat");

const deploy = async (name, ...params) => {
    const Contract = await ethers.getContractFactory(name);
    const contract = await Contract.deploy(...params);
    await contract.deployed();
    return contract;
};

const attach = async (name, address) => {
    return await ethers.getContractAt(name, address);
}

const deployComptroller = async () => {
    return await deploy("Comptroller")
};

const deployInterestRateModel = async () => {
    return await deploy("JumpRateModel", 0, 0, 0, 0);
}

const deployOracle = async () => {
    return await deploy("SimplePriceOracle");
}

const deployCEther = async (comptroller, interestRateModel, admin) => {
    return await deploy(
        "CEther",
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "CEther",
        "cETH",
        8,
        admin.address
    );
}

const deployTestCoin = async () => {
    return await deploy("TestCoin", ethers.utils.parseEther("10000"));
}

const deployCTestCoin = async (testCoin, comptroller, interestRateModel) => {
    return await deploy(
        "CErc20",
        testCoin.address,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "CTestToken",
        "CTT",
        8
    );
}

const deployCWEther = async (wethAddress, comptroller, interestRateModel) => {
    return await deploy(
        "CErc20",
        wethAddress,
        comptroller.address,
        interestRateModel.address,
        ethers.utils.parseUnits("1", 18),
        "CWEther",
        "cWETH",
        8
    );
}

const setComptroller = async (comptroller, cEther, cTestCoin, cWETH) => {
    const tasks = [];
    tasks.push(comptroller._supportMarket(cTestCoin.address));
    tasks.push(comptroller._supportMarket(cEther.address));
    tasks.push(comptroller._setCollateralFactor(cTestCoin.address, ethers.utils.parseUnits("0.75", 18)));
    tasks.push(comptroller._setCollateralFactor(cEther.address, ethers.utils.parseUnits("0.75", 18)));
    if (cWETH) {
        tasks.push(comptroller._supportMarket(cWETH.address));
        tasks.push(comptroller._setCollateralFactor(cWETH.address, ethers.utils.parseUnits("0.75", 18)));
    }
    tasks.push(comptroller._setCloseFactor(ethers.utils.parseUnits("0.5", 18)));
    tasks.push(comptroller._setLiquidationIncentive(ethers.utils.parseUnits("0.5", 18)));
    await Promise.all(tasks);
}

const setOracle = async (oracle, cEther, cTestCoin, cWEther) => {
    const tasks = [];
    tasks.push(oracle.setUnderlyingPrice(cEther.address, ethers.utils.parseUnits("1", 18)));
    tasks.push(oracle.setUnderlyingPrice(cTestCoin.address, ethers.utils.parseUnits("1", 18)));
    if (cWEther) {
        tasks.push(oracle.setUnderlyingPrice(cWEther.address, ethers.utils.parseUnits("1", 18)));
    }
    await Promise.all(tasks);
}

const deployAndSetComptroller = async (admin, wethAddress) => {
    const comptroller = await deployComptroller();
    console.log("Comptroller deployed to:", comptroller.address);

    const interestRateModel = await deployInterestRateModel();
    console.log(`InterestRateModel deployed to: ${interestRateModel.address}`);

    const oracle = await deployOracle();
    console.log("Oracle deployed to:", oracle.address);

    // Set oracle to comptroller
    await comptroller._setPriceOracle(oracle.address);

    // Set CEther
    const cEther = await deployCEther(comptroller, interestRateModel, admin);
    console.log("CEther deployed to:", cEther.address);

    // Set TestCoin
    const testCoin = await deployTestCoin();
    console.log("TestCoin deployed to:", testCoin.address);
    const cTestCoin = await deployCTestCoin(testCoin, comptroller, interestRateModel);
    console.log("cTestCoin deployed to:", cTestCoin.address);

    let cWEther;
    if (wethAddress != "") {
        // Set CWEther
        cWEther = await deployCWEther(wethAddress, comptroller, interestRateModel);
        console.log("cWEther deployed to:", cWEther.address);
    }

    console.log("Setting parameters");
    // Set prices
    await setOracle(oracle, cEther, cTestCoin, cWEther);
    // Set comptroller
    await setComptroller(comptroller, cEther, cTestCoin, cWEther);

    return [comptroller, oracle, cEther, testCoin, cTestCoin, cWEther]
};

const checkCompoundFailure = async(tx) => {
    let txResult = await tx.wait()
    let failure = txResult.events.find(_ => _.event === 'Failure');
    if (failure) {
        const errorCode = failure.args.error;
        throw new Error(
            `See https://compound.finance/docs/ctokens#ctoken-error-codes\n` +
            `Code: ${errorCode}\n`
        );
    }
};


module.exports = {
    deployAndSetComptroller,
    deploy,
    attach,
    checkCompoundFailure,
}
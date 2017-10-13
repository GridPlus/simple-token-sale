/* global artifacts */

const Sale = artifacts.require('./Sale.sol');
const fs = require('fs');

const flattenTimeLockData = function flattenTimeLockData(timeLockData) {
  const flattenedTimeLockData = {
    beneficiaries: [],
    allocations: [],
    disbursementDates: [],
    disbursementPeriods: [],
  };

  Object.keys(timeLockData).map((beneficiaryIndex) => {
    const beneficiary = timeLockData[beneficiaryIndex];
    Object.keys(beneficiary.tranches).map((tranchIndex) => {
      const tranch = beneficiary.tranches[tranchIndex];
      flattenedTimeLockData.beneficiaries.push(beneficiary.address);
      flattenedTimeLockData.allocations.push(tranch.amount);
      flattenedTimeLockData.disbursementDates.push(tranch.date);
      flattenedTimeLockData.disbursementPeriods.push(tranch.period);
      return tranch;
    });
    return beneficiary;
  });

  return flattenedTimeLockData;
};

module.exports = (deployer) => {
  const saleConf = JSON.parse(fs.readFileSync('./conf/sale.json'));
  const tokenConf = JSON.parse(fs.readFileSync('./conf/token.json'));
  const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
  const timelocksConf = JSON.parse(fs.readFileSync('./conf/timelocks.json'));
  const preBuyers = Object.keys(preBuyersConf).map(preBuyer => preBuyersConf[preBuyer].address);
  const timeLockData = flattenTimeLockData(timelocksConf);

  return deployer.deploy(Sale,
    saleConf.owner,
    saleConf.wallet,
    tokenConf.initialAmount,
    tokenConf.tokenName,
    tokenConf.decimalUnits,
    tokenConf.tokenSymbol,
    saleConf.price,
    saleConf.startBlock,
    saleConf.freezeBlock,
    preBuyers.length,
    timeLockData.beneficiaries.length,
    saleConf.endBlock,
  );
};

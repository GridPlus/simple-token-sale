/* global artifacts */

const Sale = artifacts.require('./Sale.sol');
const fs = require('fs');
const BN = require('bn.js');

const distributePreBuyersTokens = async function distributePreBuyersTokens(addresses, tokens) {
  const BATCHSIZE = 20;
  if (addresses.length !== tokens.length) {
    throw new Error('The number of pre-buyers and pre-buyer token allocations do not match');
  }

  const addressesChunk = addresses.slice(0, BATCHSIZE);
  const tokensChunk = tokens.slice(0, BATCHSIZE);
  const sale = await Sale.deployed();
  await sale.distributePreBuyersRewards(addressesChunk, tokensChunk);
  console.log(`Distributed tokens to a batch of ${addressesChunk.length} pre-buyers`);

  if (addresses.length <= BATCHSIZE) {
    return addressesChunk;
  }

  return addressesChunk.concat(await distributePreBuyersTokens(
    addresses.slice(BATCHSIZE),
    tokens.slice(BATCHSIZE),
  ));
};


const distributeTimelockedTokens = async function distributeTimeLockedTokens(addresses, tokens,
  timelocks, periods, logs) {
  const BATCHSIZE = 4;
  if (addresses.length !== tokens.length) { // expand
    throw new Error('The number of pre-buyers and pre-buyer token allocations do not match');
  }

  const addressesChunk = addresses.slice(0, BATCHSIZE);
  const tokensChunk = tokens.slice(0, BATCHSIZE);
  const timelocksChunk = timelocks.slice(0, BATCHSIZE);
  const periodsChunk = periods.slice(0, BATCHSIZE);

  const sale = await Sale.deployed();
  const receipt = await sale.distributeTimelockedTokens(addressesChunk, tokensChunk,
    timelocksChunk, periodsChunk);
  console.log(`Distributed a batch of ${addressesChunk.length} timelocked token chunks`);

  if (addresses.length <= BATCHSIZE) {
    return logs.concat(receipt.logs);
  }

  return distributeTimeLockedTokens(
    addresses.slice(BATCHSIZE),
    tokens.slice(BATCHSIZE),
    timelocks.slice(BATCHSIZE),
    periods.slice(BATCHSIZE),
    logs.concat(receipt.logs),
  );
};

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
  console.log('deployer', deployer);
  const preBuyersConf = JSON.parse(fs.readFileSync('./conf/preBuyers.json'));
  const timelocksConf = JSON.parse(fs.readFileSync('./conf/timelocks.json'));

  const preBuyers = Object.keys(preBuyersConf).map(preBuyer => preBuyersConf[preBuyer].address);
  const preBuyersTokens = Object.keys(preBuyersConf).map(preBuyer =>
    new BN(preBuyersConf[preBuyer].amount, 10));

  const timeLockData = flattenTimeLockData(timelocksConf);

  distributePreBuyersTokens(preBuyers, preBuyersTokens)
    .then(() => distributeTimelockedTokens(
      timeLockData.beneficiaries,
      timeLockData.allocations,
      timeLockData.disbursementDates,
      timeLockData.disbursementPeriods,
      [],
    ))
    .then((logs) => {
      if (!fs.existsSync('logs_distribution')) {
        fs.mkdirSync('logs_distribution');
      }
      fs.writeFileSync('logs_distribution/logs_distribution.json', JSON.stringify(logs, null, 2));
    });
};

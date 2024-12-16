import "@nomicfoundation/hardhat-toolbox";

module.exports = {
  solidity: "0.8.28",
  networks: {
    dev: {
      url: "http://localhost:8545",
    },
  },
  paths: {
    sources: "./src",
    tests: "./test/e2e",
    cache: "./cache/hardhat",
    artifacts: "./artifacts/hardhat",
  },
};

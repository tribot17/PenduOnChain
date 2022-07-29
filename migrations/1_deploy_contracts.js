var mainContract = artifacts.require("./mainContract.sol");

module.exports = function (deployer) {
  //Si on veut mettre des addresses directement via le contructeur c'est ici que ça va se faire
  deployer.deploy(mainContract, 9215);
};

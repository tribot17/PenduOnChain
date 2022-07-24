const mainConctract = artifacts.require(`./mainContract.sol`);
const {
  BN,
  expectRevert,
  expectEvent,
  balance,
  send,
  ether,
} = require(`@openzeppelin/test-helpers`);
const { expect } = require(`chai`);

contract("mainContract", (accounts) => {
  const owner = accounts[0];
  const player1 = accounts[1];
  const player2 = accounts[2];

  let testCounter = 0; // variable qui permet de numéroter nos tests

  beforeEach(async function () {
    this.mainConctractInstance = await mainConctract.new(5, { from: owner });
  });

  context("------- Test creation session -------", () => {
    it(`${testCounter++} : Devrait créer un session`, async function () {
      await this.mainConctractInstance.createSession("1", {
        from: player1,
        value: "1",
      });
      const session = await this.mainConctractInstance.session(1);

      await expect(session.player1).to.be.equal(player1);
    });
  });
});

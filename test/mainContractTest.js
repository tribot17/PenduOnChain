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

  let testCounter = 1; // variable qui permet de numéroter nos tests

  beforeEach(async function () {
    this.mainConctractInstance = await mainConctract.new(5, { from: owner });
  });

  /*Test : 
    Ajouter un mot
    Lancer la session
    Tirer les mots au hasard
    Deviner une bonne lettre
    Deviner une mauvaise lettre
    Le score doit augmenter
    Si la lettre est plusieurs dans le mot
    Une fois tous les mots trouvés toutes les infos sont sensé se reset
    Withdraw function
  */

  context("------- Test creation session -------", () => {
    beforeEach(async function () {
      await this.mainConctractInstance.createSession("1", {
        from: player1,
        value: "1",
      });
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : L'id de la session devrait être égal à 1`, async function () {
      await expect(this.session.sessionId).to.be.bignumber.equal("1");
    });

    it(`${testCounter++} : Le joueur 1 devrait être le createur de la session`, async function () {
      await expect(this.session.player1).to.be.bignumber.equal(player1);
    });

    it(`${testCounter++} : La valeur de pari devrait être égal à 1`, async function () {
      await expect(this.session.bet).to.be.bignumber.equal("1");
    });

    it(`${testCounter++} : Le joueur 2 devrait être null`, async function () {
      await expect(this.session.player2).to.be.bignumber.equal(
        "0x0000000000000000000000000000000000000000"
      );
    });

    it(`${testCounter++} : La session ne devrait pas être complète`, async function () {
      await expect(this.session.isComplete).to.be.equal(false);
    });

    it(`${testCounter++} : La partie ne devrait pas être commencé`, async function () {
      await expect(this.session.started).to.be.equal(false);
    });

    it(`${testCounter++} : La partie ne devrait pas être terminé`, async function () {
      await expect(this.session.ended).to.be.equal(false);
    });

    it(`${testCounter++} : La partie ne devrait pas être terminé`, async function () {
      await expect(this.session.ended).to.be.equal(false);
    });
  });

  context("------- Test rejoindre une session -------", () => {
    beforeEach(async function () {
      await this.mainConctractInstance.createSession("1", {
        from: player1,
        value: "1",
      });
      await this.mainConctractInstance.joinSession("1", {
        from: player2,
        value: "1",
      });
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : Le joueur 2 devrait rejoindre la session 1`, async function () {
      await expect(this.session.player2).to.bignumber.be.equal(player2);
    });

    it(`${testCounter++} : La session 1 devrait être complète`, async function () {
      await expect(this.session.isComplete).to.be.equal(true);
    });

    it(`${testCounter++} : La session 1 ne devrait pas être finie`, async function () {
      await expect(this.session.ended).to.be.equal(false);
    });
  });
});

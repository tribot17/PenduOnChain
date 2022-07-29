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
  const player3 = accounts[3];

  let testCounter = 1; // variable qui permet de numéroter nos tests

  beforeEach(async function () {
    this.mainConctractInstance = await mainConctract.new(9215, { from: owner });
  });

  context("------- Test variable -------", () => {
    it(`${testCounter++} : WordList devrait être vide`, async function () {
      const WordList = await this.mainConctractInstance.getWordList();
      await expect(WordList.length).to.be.equal(0);
    });
  });

  context("------- Test creation session -------", () => {
    beforeEach(async function () {
      this.receipt = await this.mainConctractInstance.createSession("1", {
        from: player1,
        value: "1",
      });
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : L'id de la session devrait être égal à 1`, async function () {
      await expect(this.session.sessionId).to.be.bignumber.equal("1");
    });

    it(`${testCounter++} : Le joueur 1 ne doit pas pouvoir créer une autre session`, async function () {
      await expectRevert(
        this.mainConctractInstance.createSession("1", {
          from: player1,
          value: "1",
        }),
        "You are already playing"
      );
    });

    it(`${testCounter++} : Le joueur 1 devrait être le createur de la session`, async function () {
      await expect(this.session.player1).to.be.bignumber.equal(player1);
    });

    it(`${testCounter++} : Le status de joueur 1 devrait être entrain de jouer`, async function () {
      const player = await this.mainConctractInstance.userInfo(player1);
      await expect(player.isPlaying).to.be.equal(true);
    });

    it(`${testCounter++} : La valeur du pari devrait être égal à 1`, async function () {
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

    it(`${testCounter++} : L'évenement session crée devrais être émis`, async function () {
      await expectEvent(this.receipt, "sessionCreated", {
        0: new BN(1),
      });
    });
  });

  context("------- Test rejoindre une session -------", () => {
    beforeEach(async function () {
      this.before = await balance.tracker(player2);

      await this.mainConctractInstance.createSession(ether("1"), {
        from: player1,
        value: ether("1"),
      });
      this.receipt = await this.mainConctractInstance.joinSession("1", {
        from: player2,
        value: ether("1"),
      });
      this.after = await this.before.delta();
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : Le joueur 2 devrait avoir payer bet`, async function () {
      await expect(this.after).to.be.bignumber.equal("-1002395600000000000");
    });

    it(`${testCounter++} : L'évenement session rejoind devrais être émis`, async function () {
      await expectEvent(this.receipt, "sessionJoined", {
        0: "1",
      });
    });

    it(`${testCounter++} : Le joueur 2 ne devrait pas pouvoir rejoindre une autre session`, async function () {
      await this.mainConctractInstance.createSession(ether("1"), {
        from: player3,
        value: ether("1"),
      });

      await expectRevert(
        this.mainConctractInstance.joinSession("2", {
          from: player2,
          value: ether("1"),
        }),
        "You are already playing"
      );
    });

    it(`${testCounter++} : La session 1 devrait être complète`, async function () {
      await expect(this.session.isComplete).to.be.equal(true);
    });

    it(`${testCounter++} : La session 1 ne devrait pas être finie`, async function () {
      await expect(this.session.ended).to.be.equal(false);
    });
  });

  context("------- Test démarage session -------", () => {
    beforeEach(async function () {
      await this.mainConctractInstance.createSession("1", {
        from: player1,
        value: "1",
      });
      this.receipt = await this.mainConctractInstance.joinSession("1", {
        from: player2,
        value: "1",
      });
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : Devrait ajouter salut à la wordList`, async function () {
      await this.mainConctractInstance.addWord("salut", { from: owner });

      expect((await this.mainConctractInstance.getWordList())[0]).to.be.equal(
        "salut"
      );
    });

    it(`${testCounter++} : Le status de joueur 2 devrait être entrain de jouer`, async function () {
      const player = await this.mainConctractInstance.userInfo(player2);
      await expect(player.isPlaying).to.be.equal(true);
    });

    it(`${testCounter++} : La session devrait être complete`, async function () {
      await expect(this.session.isComplete).to.be.equal(true);
    });

    it(`${testCounter++} : Devrait commencer la session`, async function () {
      this.receiptStarted = await this.mainConctractInstance.startSession({
        from: player1,
      });
      this.session = await this.mainConctractInstance.session(1);

      await expect(this.session.started).to.be.equal(true);
      await expectEvent(this.receiptStarted, "sessionStarted", {
        0: new BN(1),
      });
    });

    it(`${testCounter++} : C'est au tour du joueur 1`, async function () {
      await expect(this.session.playerTurn).to.be.bignumber.equal(new BN(0));
    });
  });

  context("------- Test jeu -------", () => {
    beforeEach(async function () {
      await this.mainConctractInstance.createSession(ether("1"), {
        from: player1,
        value: ether("1"),
      });
      await this.mainConctractInstance.joinSession("1", {
        from: player2,
        value: ether("1"),
      });
      await this.mainConctractInstance.startSession({
        from: player1,
      });
      this.session = await this.mainConctractInstance.session(1);
    });

    it(`${testCounter++} : Renvoie une erreur ce n'est pas une lettre`, async function () {
      await expectRevert(
        this.mainConctractInstance.guessWord("ab", { from: player1 }),
        "It's not a letter"
      );
    });

    it(`${testCounter++} : Le joueur 2 ne devrait pas pouvoir jouer`, async function () {
      await expectRevert(
        this.mainConctractInstance.guessWord("a", { from: player2 }),
        "It's not your turn"
      );
    });

    //Ces tests fonctionne uniquement avec un mot déjà défini en dur dans le code et non avec un mot au hasard
    it(`${testCounter++} : Le joueur 1 devrait essayer le lettre s`, async function () {
      const receipt = await this.mainConctractInstance.guessWord("a", {
        from: player1,
      });
      await expectEvent(receipt, "play");
    });

    it(`${testCounter++} : Le joueur 1 ne devrait pas pouvoir jouer`, async function () {
      const receipt = await this.mainConctractInstance.guessWord("a", {
        from: player1,
      });
      await expectEvent(receipt, "play");
    });

    it(`${testCounter++} : Le joueur 2 devrait pouvoir jouer`, async function () {
      await this.mainConctractInstance.guessWord("a", {
        from: player1,
      });
      const userInfo = await this.mainConctractInstance.userInfo(player2);
      await expect(userInfo.isPlayerTurn).to.be.equal(true);
    });

    it(`${testCounter++} : Le joueur 1 devrait trouver une bonne lettre`, async function () {
      const receipt = await this.mainConctractInstance.guessWord("a", {
        from: player1,
      });
      await expectEvent(receipt, "play", { 0: true });
    });

    it(`${testCounter++} : Le joueur 2 devrait trouver une mauvaise lettre`, async function () {
      const receipt = await this.mainConctractInstance.guessWord("b", {
        from: player1,
      });
      await expectEvent(receipt, "play", { 0: false });
    });

    it(`${testCounter++} : On ne peut pas utiliser 2 fois la même lettres`, async function () {
      await this.mainConctractInstance.guessWord("b", {
        from: player1,
      });
      await this.mainConctractInstance.guessWord("b", {
        from: player2,
      });
      await expectRevert(
        this.mainConctractInstance.guessWord("b", {
          from: player1,
        }),
        "You have already used this letter"
      );
    });

    it(`${testCounter++} : Le joueur 1 devrait gagner et les infos sont remis à zero ensuite et retire les fonds`, async function () {
      //Creation de toute la phase de jeu
      await this.mainConctractInstance.guessWord("s", {
        from: player1,
      });
      await this.mainConctractInstance.guessWord("h", {
        from: player2,
      });
      await this.mainConctractInstance.guessWord("a", {
        from: player1,
      });
      await this.mainConctractInstance.guessWord("i", {
        from: player2,
      });
      await this.mainConctractInstance.guessWord("l", {
        from: player1,
      });
      await this.mainConctractInstance.guessWord("j", {
        from: player2,
      });
      await this.mainConctractInstance.guessWord("u", {
        from: player1,
      });
      await this.mainConctractInstance.guessWord("k", {
        from: player2,
      });
      const receipt = await this.mainConctractInstance.guessWord("t", {
        from: player1,
      });
      //Vérification que les userInfo sont vides
      const userInfo1 = await this.mainConctractInstance.userInfo(player1);
      const userInfo2 = await this.mainConctractInstance.userInfo(player2);

      await expect(userInfo1.isPlaying).to.be.equal(false);
      await expect(userInfo2.isPlaying).to.be.equal(false);
      await expectEvent(receipt, "sessionEnded", {
        0: "1000000000000000000",
        1: player1,
      });

      const tracker1 = await balance.tracker(player1);
      await this.mainConctractInstance.withdraw({ from: player1 });
      const profit1 = await tracker1.delta();
      //2Eth - les gas fee
      expect(profit1).to.be.bignumber.equal("1999586180000000000");
    });
  });
});

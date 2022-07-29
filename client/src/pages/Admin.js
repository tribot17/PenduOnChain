import React, { useState, useEffect } from "react";
import getWeb3 from "../getWeb3";
import mainContract from "../contracts/mainContract.json";

const Admin = () => {
  const [contract, setContract] = useState();
  const [accounts, setAccounts] = useState();
  const [wordValue, setWordValue] = useState();
  const [wordList, setWordList] = useState();

  useEffect(() => {
    loadData();
  });

  const loadData = async () => {
    const web3 = await getWeb3();
    const accounts = await web3.eth.getAccounts();
    const networkId = await web3.eth.net.getId();
    const deployedNetwork = mainContract.networks[networkId];
    const contract = await new web3.eth.Contract(
      mainContract.abi,
      deployedNetwork && deployedNetwork.address
    );

    const wordList = await contract.methods.getWordList().call();
    console.log(contract.methods);

    setWordList(wordList);
    setContract(contract);
    setAccounts(accounts[0]);
  };

  const handleSendWord = async () => {
    await contract.methods.addWord(wordValue).send({ from: accounts });
    setWordList(await contract.methods.getWordList().call());
  };
  return (
    <div>
      <h1>Admin</h1>
      <p>Ajouter un mot</p>
      <input onChange={(e) => setWordValue(e.target.value)} />
      <button onClick={handleSendWord}>Valider</button>
      <h3>WordList : </h3>
      <ul>{wordList && wordList.map((n) => <li>{n}</li>)}</ul>
    </div>
  );
};

export default Admin;

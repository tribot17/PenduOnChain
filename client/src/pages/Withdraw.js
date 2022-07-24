import React, { useEffect, useState } from "react";
import getWeb3 from "../getWeb3";
import mainContract from "../contracts/mainContract.json";

const Withdraw = () => {
  const [withdrawValue, setWithdrawValue] = useState();
  const [contract, setContract] = useState();
  const [accounts, setAccounts] = useState();

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

    const userInfo = await contract.methods.userInfo(accounts[0]).call();

    setWithdrawValue(userInfo.withdrawValue);
    setContract(contract);
    setAccounts(accounts[0]);
  };

  const handleWithdraw = async () => {
    await contract.methods.withdraw().send({ from: accounts });
  };

  return (
    <div>
      <h1>Withdraw</h1>

      <p>Vous pouvez retirer : {withdrawValue}</p>
      <button onClick={handleWithdraw}>Retirer</button>
    </div>
  );
};

export default Withdraw;

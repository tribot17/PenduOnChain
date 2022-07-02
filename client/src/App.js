import { useEffect, useState } from "react";
import getWeb3 from "./getWeb3";
import mainContract from "./contracts/mainContract.json";

function App() {
  const [web3, setWeb3] = useState();
  const [accounts, setAccounts] = useState();
  const [contract, setContract] = useState();
  const [inputValue, setInputValue] = useState({});
  const [gameStarted, setGameStarted] = useState(false);
  const [sessionId, setSessionId] = useState();
  const [playing, setPlaying] = useState();
  const [userInfos, setUserInfos] = useState();

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

    console.log(userInfo);
    setWeb3(web3);
    setAccounts(accounts[0]);
    setContract(contract);
    setUserInfos(userInfo);
    setGameStarted(userInfo.isPlaying);
    if (userInfo.isPlaying) {
      setSessionId(
        (await contract.methods.session(userInfo.sessionId).call()).sessionId
      );
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setInputValue({ ...inputValue, [name]: value });
    console.log(inputValue);
  };

  const handleCreateSession = async (bet) => {
    if (bet !== undefined)
      await contract.methods
        .createSession(bet)
        .send({ from: accounts, value: bet })
        .then((res) => {
          setSessionId(res.events.sessionCreated.returnValues._sessionIndex);
          setPlaying(true);
          setGameStarted(true);
        });
  };

  const handleJoinSession = async (sessionIndex) => {
    let sessionInfo = await contract.methods.session(sessionIndex).call();
    if (sessionIndex !== undefined)
      await contract.methods
        .joinSession(sessionIndex)
        .send({ from: accounts, value: sessionInfo.bet })
        .then((res) => {
          console.log(res);
          setPlaying(true);
        });
  };

  return (
    <div>
      <h1>Jeu du pendu</h1>
      {!gameStarted ? (
        <>
          <div className="createSession">
            <h3>Créer une session</h3>
            <label htmlFor="bet">
              Valeur du parie
              <input type="number" name="bet" onChange={handleInputChange} />
            </label>
            <button onClick={() => handleCreateSession(inputValue.bet)}>
              Créer la session
            </button>
          </div>
          <div className="joinSession">
            <h3>Rejoindre une session</h3>
            <label htmlFor="sessionId">
              Id de la session
              <input
                type="number"
                name="sessionId"
                onChange={handleInputChange}
              />
            </label>
            <button onClick={() => handleJoinSession(inputValue.sessionId)}>
              Rejoindre la session
            </button>
          </div>
        </>
      ) : (
        <>
          <p>Session ID : {sessionId && sessionId}</p>
          <div className="gameContainer">
            <label htmlFor="letter">
              <input name="letter" type="text" />
            </label>
            <button>Valider</button>
          </div>
          <button>Abandonner</button>
        </>
      )}
      {playing && <></>}
    </div>
  );
}

export default App;

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
  const [isCreator, setIsCreator] = useState();
  const [sessionError, setSessionError] = useState();
  const [playerError, setPlayerError] = useState();
  const [word, setWord] = useState();
  const [score, setScore] = useState(0);
  const [playerTurn, setPlayerTurn] = useState(false);
  const [wordUsed, setWordUsed] = useState([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [arrayWord, setArrayWord] = useState([]);
  const [winner, setWinner] = useState();
  let setted = false;

  useEffect(() => {
    loadData();
  });

  useEffect(() => {
    if (playing) {
      fetchTurn();
    }
  }, [score]);

  //Get onChain Data
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

    setWeb3(web3);
    setAccounts(accounts[0]);
    setContract(contract);
    setUserInfos(userInfo);
    if (userInfo.sessionId != 0) {
      let sessionInfos = await contract.methods
        .session(userInfo.sessionId)
        .call();
      setGameStarted(true);
      if (sessionInfos.started) {
        setPlaying(true);
        setGameStarted(true);
        setWord(sessionInfos.word);
        getWord(sessionInfos.word);
        setScore(userInfo.score);
        setPlayerTurn(userInfo.isPlayerTurn);
        if (localStorage.getItem("Words"))
          setWordUsed([localStorage.getItem("Words").split(",")][0]);
      }
      setSessionId(sessionInfos.sessionId);
      if (sessionInfos.player1 === accounts[0]) setIsCreator(true);
    }
  };

  const getWord = (word) => {
    if (!setted)
      for (let i = 0; i < word.length; i++) {
        arrayWord.push(word[i]);
      }
    setted = true;
  };

  const fetchUserData = async () => {
    const userInfo = await contract.methods.userInfo(accounts).call();
    setUserInfos(userInfo);

    return userInfo;
  };

  //Check all 5s if is the user turn if the game has started
  const fetchTurn = async () => {
    const interval = setInterval(async () => {
      console.log("fetching", accounts);
      const thisUserInfo = await contract.methods.userInfo(accounts).call();
      const sessionData = await contract.methods
        .session(thisUserInfo.sessionId)
        .call();
      setPlayerTurn(thisUserInfo.isPlayerTurn);
      if (sessionData.player1 == "0x0000000000000000000000000000000000000000") {
        setSessionEnded(true);
        localStorage.removeItem("Words");
        setTimeout(() => {
          setPlaying(false);
          setGameStarted(false);
          setSessionEnded(false);
        }, 5000);
      }
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    setInputValue({ ...inputValue, [name]: value });
  };

  const handleCreateSession = async (bet) => {
    if (bet !== undefined)
      await contract.methods
        .createSession(bet)
        .send({ from: accounts, value: bet })
        .then(async (res) => {
          setSessionId(res.events.sessionCreated.returnValues._sessionIndex);
          setGameStarted(true);
          setIsCreator(true);
        });
  };

  const handleJoinSession = async (sessionIndex) => {
    let sessionInfo = await contract.methods.session(sessionIndex).call();
    console.log(sessionInfo);
    if (sessionIndex !== undefined)
      await contract.methods
        .joinSession(sessionIndex)
        .send({
          from: accounts,
          value: sessionInfo.bet,
        })
        .then((res) => {
          setSessionId(res.events.sessionJoined.returnValues._sessionIndex);
          setGameStarted(true);
          localStorage.removeItem("Words");
        });
  };

  const handleLaunchSession = async () => {
    let sessionData = await contract.methods.session(sessionId).call();
    console.log(sessionData);
    if (sessionData.player2 !== "0x0000000000000000000000000000000000000000")
      await contract.methods
        .startSession()
        .send({ from: accounts })
        .then((res) => {
          console.log(res);
          setPlaying(true);
          setPlayerTurn(true);
          setSessionError(false);
          setWord(sessionData.word);
          getWord(sessionData.word);
          localStorage.removeItem("Words");
        });
    else setSessionError(true);
  };

  const handleGetReady = async () => {
    let sessionData = await contract.methods.session(sessionId).call();
    if (sessionData.started) {
      setPlaying(true);
      setSessionError(false);
      setWord(sessionData.word);
      getWord(sessionData.word);
    } else setSessionError(true);
  };

  const handleSendLetter = async (letter) => {
    let userInfo = await fetchUserData();
    let temp = wordUsed;
    if (userInfo.isPlayerTurn) {
      if (letter !== undefined)
        await contract.methods
          .guessWord(letter)
          .send({ from: accounts })
          .then((res) => {
            setScore(parseInt(score) + parseInt(checkLetter(letter)));
            setPlayerError(false);
            setPlayerTurn(false);
            fetchTurn();
            setWordUsed([...wordUsed, letter]);
            temp.push(letter);
            //Store the word in the local storage to keep it if the user refresh the page
            localStorage.setItem("Words", temp);
            if (
              res.events.sessionEnded &&
              res.events.sessionEnded.returnValues.winner == accounts
            ) {
              setWinner(true);
              setSessionEnded(true);
              localStorage.removeItem("Words");
              setTimeout(() => {
                setGameStarted(false);
                setPlaying(false);
                setSessionEnded(false);
              }, 5000);
            }
          });
    } else setPlayerError(true);
  };

  const checkLetter = (letter) => {
    let score = 0;
    for (let i = 0; i < word.length; i++) {
      if (word[i] === letter) score++;
    }
    return score;
  };

  return (
    <div>
      <h1 style={{ textAlign: "center" }}>Jeu du pendu</h1>
      {!gameStarted ? (
        <div className="sessionJoin_Create">
          <div className="createSession">
            <h3>Créer une session</h3>
            <label htmlFor="bet">
              Valeur de parie
              <input type="number" name="bet" onChange={handleInputChange} />
            </label>
            <button
              onClick={() =>
                handleCreateSession(web3.utils.toWei(inputValue.bet, "ether"))
              }
            >
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
        </div>
      ) : (
        !playing && (
          <>
            {isCreator ? (
              <div>
                <h3>En attente du second joueur</h3>
                <h3>L'id de votre session : {sessionId}</h3>
              </div>
            ) : (
              <h3>En attente de l'hôte sessionId : {sessionId}</h3>
            )}

            <button
              onClick={
                isCreator ? () => handleLaunchSession() : () => handleGetReady()
              }
            >
              {isCreator ? "Jouer" : "Prêt"}
            </button>
            <br />
            {sessionError && "Tous les joueurs ne sont pas prêts"}
          </>
        )
      )}
      {playing && (
        <>
          <p>Session ID : {sessionId && sessionId}</p>
          <p>Votre score : {score}</p>
          <p>Mots : </p>
          {arrayWord &&
            arrayWord.map((n) =>
              wordUsed.includes(n) ? <p>{n}</p> : <p>_</p>
            )}
          <p>{!playerTurn ? "Ce n'est pas votre tour" : "C'est votre tour"}</p>
          <div className="gameContainer">
            <label htmlFor="letter">
              <input name="letter" type="text" onChange={handleInputChange} />
            </label>
            <button onClick={() => handleSendLetter(inputValue.letter)}>
              Valider
            </button>
            <br />
            {playerError && "Ce n'est pas vôtre tour, réassayer plus tard"}
          </div>
          <button onClick={fetchTurn()}>Rafraichir</button>
        </>
      )}
      {gameStarted && sessionEnded && (
        <>
          <h1>La session est terminé</h1>
          {winner ? <p>Vous avez gagné</p> : <p>Vous avez perdu</p>}
        </>
      )}
    </div>
  );
}

export default App;

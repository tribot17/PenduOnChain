pragma solidity 0.8.14;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract mainContract is VRFConsumerBaseV2, Ownable {
    VRFCoordinatorV2Interface COORDINATOR;

    address vrfCoordinator = 0x6168499c0cFfCaCD319c818142124B7A15E857ab;

    bytes32 keyHash =
        0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc;

    IERC20 LINK = IERC20(0x01BE23585060835E02B77ef475b0Cc51aA1e0709);

    uint32 callbackGasLimit = 100000;

    uint16 requestConfirmations = 3;

    uint64 s_subscriptionId;

    uint256 public s_requestId;

    string[] wordList;

    uint256 sessionIndex = 0;

    uint256 WordToGuessIndex;

    uint256[] public s_randomWords;

    struct UserInfos {
        bool isPlaying;
        bool isPlayerTurn;
        uint256 sessionId;
        uint256 score;
        uint256 currentBet;
        uint256 nbTry;
        uint256 withdrawValue;
        string[] letterGuessed;
    }

    struct Session {
        uint256 bet;
        uint256 sessionId;
        address player1;
        address player2;
        uint256 playerTurn;
        string word;
        bool isComplete;
        bool started;
        bool ended;
    }

    mapping(address => UserInfos) public userInfo;

    mapping(uint256 => Session) public session;

    event sessionCreated(uint256 _sessionIndex);

    event sessionJoined(uint256 _sessionIndex);

    event sessionStarted(uint256 _sessionIndex);

    event play(bool founLetter);

    event sessionEnded(uint256 bet, address winner);

    constructor(uint64 subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    function addWord(string memory _word) public onlyOwner {
        wordList.push(_word);
    }

    function createSession(uint256 _bet) public payable {
        require(!userInfo[msg.sender].isPlaying, "You are already playing");
        (bool sucess, ) = address(this).call{value: _bet}("");
        require(sucess, "not enougth founds");
        requestRandomWords();
        sessionIndex++;
        session[sessionIndex].bet = _bet;
        session[sessionIndex].word = wordList[WordToGuessIndex];;
        session[sessionIndex].sessionId = sessionIndex;
        session[sessionIndex].player1 = msg.sender;
        session[sessionIndex].ended = false;
        userInfo[msg.sender].isPlaying = true;
        userInfo[msg.sender].sessionId = sessionIndex;
        userInfo[msg.sender].nbTry = 0;
        emit sessionCreated(sessionIndex);
    }

    function joinSession(uint256 _sessionId) public payable {
        require(session[_sessionId].bet > 0, "Session error");
        require(!userInfo[msg.sender].isPlaying, "You are already playing");
        require(!session[_sessionId].ended, "Session is ended");
        (bool sucess, ) = address(this).call{value: session[_sessionId].bet}(
            ""
        );
        require(sucess, "Not enougth funds sended");
        userInfo[msg.sender].sessionId = _sessionId;
        userInfo[msg.sender].isPlaying = true;
        userInfo[msg.sender].nbTry = 0;
        session[sessionIndex].isComplete = true;
        session[sessionIndex].player2 = msg.sender;
        emit sessionJoined(_sessionId);
    }

    function startSession() public {
        uint256 index = userInfo[msg.sender].sessionId;
        require(
            session[index].player1 == msg.sender,
            "You are not the owner of a session"
        );
        require(session[index].isComplete, "Session is not complete");
        session[index].started = true;
        userInfo[session[index].player1].isPlayerTurn = true;
        userInfo[session[index].player2].isPlayerTurn = false;
        session[index].playerTurn = 0;
        emit sessionStarted(index);
    }

    function guessWord(string memory _letter) public returns (bool) {
        uint256 index = userInfo[msg.sender].sessionId;

        require(session[index].started, "The session hasn't start yet");
        require(!session[index].ended, "The session is ended");
        require(userInfo[msg.sender].isPlayerTurn, "It's not your turn");
        require(bytes(_letter).length == 1, "It's not a letter");
        require(
            !haveUsedThisLetter(msg.sender, _letter),
            "You have already used this letter"
        );

        bool winRound = false;

        userInfo[msg.sender].isPlayerTurn = false;

        userInfo[msg.sender].letterGuessed.push(_letter);

        userInfo[msg.sender].nbTry++;

        if (session[index].playerTurn == 0) {
            userInfo[session[index].player1].isPlayerTurn = false;
            userInfo[session[index].player2].isPlayerTurn = true;
            session[index].playerTurn = 1;
        } else if (session[index].playerTurn == 1) {
            userInfo[session[index].player1].isPlayerTurn = true;
            userInfo[session[index].player2].isPlayerTurn = false;
            session[index].playerTurn = 0;
        }

        if (letterIsInWord(session[index].word, _letter) >= 1) {
            userInfo[msg.sender].score += letterIsInWord(
                session[index].word,
                _letter
            );
            winRound = true;
        }
        if (userInfo[msg.sender].score == bytes(session[index].word).length) {
            endSession(index, msg.sender);
            emit sessionEnded(session[index].bet, msg.sender);
        }

        emit play(winRound);
        return winRound;
    }

    function endSession(uint256 _sessionId, address winner) internal {
        session[_sessionId].ended = true;
        resetUserInfos(session[_sessionId].player1);
        resetUserInfos(session[_sessionId].player2);
        userInfo[winner].withdrawValue += session[_sessionId].bet * 2;
    }

    function withdraw() public {
        require(
            userInfo[msg.sender].withdrawValue > 0,
            "You have nothing to withdraw"
        );
        uint256 toSend = userInfo[msg.sender].withdrawValue;
        userInfo[msg.sender].withdrawValue = 0;
        payable(msg.sender).transfer(toSend);
    }

    function haveUsedThisLetter(address _user, string memory _letter)
        internal
        view
        returns (bool)
    {
        for (uint256 i = 0; i < userInfo[_user].letterGuessed.length; i++) {
            if (bytes(_letter)[0] == bytes(userInfo[_user].letterGuessed[i])[0])
                return true;
        }
        return false;
    }

    function letterIsInWord(string memory _word, string memory _letter)
        internal
        pure
        returns (uint256)
    {
        uint256 isLetter = 0;
        for (uint256 i = 0; i < bytes(_word).length; i++) {
            if (bytes(_word)[i] == bytes(_letter)[0]) isLetter++;
        }
        return isLetter;
    }

    function resetUserInfos(address user) internal {
        userInfo[user].isPlaying = false;
        userInfo[user].isPlayerTurn = false;
        userInfo[user].sessionId = 0;
        userInfo[user].score = 0;
        userInfo[user].nbTry = 0;

        delete userInfo[user].letterGuessed;
    }

    function requestRandomWords() internal {
        s_requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            uint32(wordList.length)
        );
    }

    function fulfillRandomWords(
        uint256, /* requestId */
        uint256[] memory randomWords
    ) internal override {
        WordToGuessIndex = (randomWords[0] % wordList.length) + 1;
    }

    function getWordList() public view returns (string[] memory) {
        return wordList;
    }

    function getSessionIndex() public view returns (uint256) {
        return sessionIndex;
    }

    receive() external payable {}
}

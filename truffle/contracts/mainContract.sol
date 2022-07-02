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

    struct UserInfos {
        bool isPlaying;
        bool isPlayerTurn;
        uint256 sessionId;
        uint256 score;
        uint256 currentBet;
        string[] letterGuessed;
    }

    struct Session {
        uint256 bet;
        uint256 sessionId;
        address players1;
        address players2;
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

    event sessionEnded(uint256 bet, address winner);

    constructor(uint64 subscriptionId) VRFConsumerBaseV2(vrfCoordinator) {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
    }

    function addWord(string memory _word) public onlyOwner {
        wordList.push(_word);
    }

    function createSession(uint256 _bet) public payable {
        // string wordToGuess = requestRandomWords();
        (bool sucess, ) = msg.sender.call{value: _bet}("");
        require(!userInfo[msg.sender].isPlaying, "You are already playing");
        require(sucess, "not enougth founds");
        sessionIndex++;
        session[sessionIndex].bet = _bet;
        session[sessionIndex].word = "RandomWord";
        session[sessionIndex].sessionId = sessionIndex;
        session[sessionIndex].players1 = msg.sender;
        session[sessionIndex].ended = false;
        userInfo[msg.sender].isPlaying = true;
        userInfo[msg.sender].sessionId = sessionIndex;
        emit sessionCreated(sessionIndex);
    }

    function joinSession(uint256 _sessionId) public payable {
        require(session[_sessionId].bet > 0, "Session error");
        require(!userInfo[msg.sender].isPlaying, "You are already playing");
        require(!session[_sessionId].ended, "Session is ended");
        (bool sucess, ) = msg.sender.call{value: session[_sessionId].bet}("");
        require(sucess, "Not enougth funds sended");
        userInfo[msg.sender].sessionId = _sessionId;
        session[sessionIndex].players2 = msg.sender;
        session[sessionIndex].isComplete = true;
    }

    function abortSession(uint256 _sessionId) public {
        require(
            userInfo[msg.sender].sessionId == _sessionId,
            "It's not your session"
        );
        require(
            !session[_sessionId].started,
            "Your session have already started"
        );
    }

    function startSession() public {
        uint256 index = userInfo[msg.sender].sessionId;
        require(
            session[index].players1 == msg.sender,
            "You are not the owner of a session"
        );
        session[index].started = true;
        userInfo[session[index].players1].isPlayerTurn = true;
        userInfo[session[index].players2].isPlayerTurn = false;
        userInfo[session[index].players2].isPlaying = true;
        session[index].playerTurn = 0;
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
        require(userInfo[msg.sender].isPlayerTurn, "it's not your turn");
        bool winRound = false;

        userInfo[msg.sender].isPlayerTurn = false;

        userInfo[msg.sender].letterGuessed.push(_letter);

        if (session[index].playerTurn == 0) {
            userInfo[session[index].players1].isPlayerTurn = false;
            userInfo[session[index].players2].isPlayerTurn = true;
            session[index].playerTurn = 1;
        } else if (session[index].playerTurn == 1) {
            userInfo[session[index].players1].isPlayerTurn = true;
            userInfo[session[index].players2].isPlayerTurn = false;
            session[index].playerTurn = 0;
        }

        if (letterIsInWord(session[index].word, _letter) >= 1) {
            userInfo[msg.sender].score += letterIsInWord(
                session[index].word,
                _letter
            );
            winRound = true;
        }
        if (userInfo[msg.sender].score == bytes(session[index].word).length)
            endSession(index, msg.sender);

        return winRound;
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

    function endSession(uint256 _sessionId, address winner) internal {
        session[_sessionId].ended = true;
        resetUserInfos(session[_sessionId].players1);
        resetUserInfos(session[_sessionId].players2);
        payable(winner).transfer(session[_sessionId].bet);
    }

    function resetUserInfos(address user) internal {
        userInfo[user].isPlaying = false;
        userInfo[user].isPlayerTurn = false;
        userInfo[user].sessionId = 0;
        userInfo[user].score = 0;
        delete userInfo[user].letterGuessed;
    }

    function requestRandomWords() external onlyOwner {
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
        // s_randomWords = randomWords;
    }

    function getWorkList() public view returns (string[] memory) {
        return wordList;
    }
}

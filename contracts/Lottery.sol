// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Lottery__NotEnoughEth();
error Lottery__TransferFailed();
error Lottery__NotOpened();
error Lottery__UpKeepNotNeeded(
    uint256 balance,
    uint256 numOfPlayers,
    uint lotteryState,
    uint lastblocktimestamp
);

contract Lottery is VRFConsumerBaseV2, AutomationCompatibleInterface {
    enum Lotterystates {
        OPEN,
        CLOSED
    }
    uint256 private immutable i_entrancefee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface private immutable i_COORDINATOR;
    bytes32 private immutable i_keyhash;
    uint64 private immutable i_subscriptionid;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private immutable i_callbackGasLimit;
    uint32 private constant NUM_WORDS = 1;
    address private s_winneraddress;
    Lotterystates private s_lotterystate;
    uint private s_lastblocktimestamp;
    uint private immutable i_interval;

    event LotteryEnter(address indexed player);
    event RequestedWinner(uint256 indexed requestId);
    event WinnerPicked(address indexed winner);

    constructor(
        uint256 entrancefee,
        address vrfcoordinator,
        bytes32 keyhash,
        uint64 subscriptionid,
        uint32 callbackGasLimit,
        uint interval
    ) VRFConsumerBaseV2(vrfcoordinator) {
        i_COORDINATOR = VRFCoordinatorV2Interface(vrfcoordinator);
        i_entrancefee = entrancefee;
        i_keyhash = keyhash;
        i_subscriptionid = subscriptionid;
        i_callbackGasLimit = callbackGasLimit;
        s_lotterystate = Lotterystates.OPEN;
        s_lastblocktimestamp = block.timestamp;
        i_interval = interval;
    }

    function enterLottery() public payable {
        if (msg.value < i_entrancefee) {
            revert Lottery__NotEnoughEth();
        }
        if (s_lotterystate != Lotterystates.OPEN) {
            revert Lottery__NotOpened();
        }
        s_players.push(payable(msg.sender));
        emit LotteryEnter(msg.sender);
    }

    function checkUpkeep(
        bytes memory /* checkData */
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /* performData */)
    {
        bool istimePassed = (block.timestamp - s_lastblocktimestamp) >
            i_interval;
        bool isEnoughPlayers = s_players.length > 0;
        bool isEnoughETH = address(this).balance > 0;
        bool isOpen = s_lotterystate == Lotterystates.OPEN;
        upkeepNeeded = (istimePassed &&
            isEnoughPlayers &&
            isEnoughETH &&
            isOpen);
    }

    function performUpkeep(bytes calldata /* performData */) external override {
        (bool upkeepNeeded, ) = checkUpkeep("");
        if (!upkeepNeeded) {
            revert Lottery__UpKeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint(s_lotterystate),
                s_lastblocktimestamp
            );
        }

        s_lotterystate = Lotterystates.CLOSED;
        uint256 requestId = i_COORDINATOR.requestRandomWords(
            i_keyhash,
            i_subscriptionid,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        emit RequestedWinner(requestId); //An event has already been created and emmited in the imported chainlink contract.
    }

    function fulfillRandomWords(
        uint256 /* _requestId*/,
        uint256[] memory _randomWords
    ) internal override {
        uint256 indexofwinner = _randomWords[0] % s_players.length;
        address payable winneraddress = s_players[indexofwinner];
        s_winneraddress = winneraddress;
        s_players = new address payable[](0);
        s_lotterystate = Lotterystates.OPEN;
        s_lastblocktimestamp = block.timestamp;
        (bool success, ) = winneraddress.call{value: address(this).balance}("");
        if (!success) {
            revert Lottery__TransferFailed();
        }
        emit WinnerPicked(winneraddress);
    }

    // View / Pure functions
    function getEntrancefee() public view returns (uint256) {
        return i_entrancefee;
    }

    function getPlayers(uint256 index) public view returns (address) {
        return s_players[index];
    }

    function getWinner() public view returns (address) {
        return s_winneraddress;
    }

    function getState() public view returns (Lotterystates) {
        return s_lotterystate;
    }

    function getInterval() public view returns (uint) {
        return i_interval;
    }

    function getLatestTimeStamp() public view returns (uint) {
        return s_lastblocktimestamp;
    }

    function getNumOfPlayers() public view returns (uint256) {
        return s_players.length;
    }
}

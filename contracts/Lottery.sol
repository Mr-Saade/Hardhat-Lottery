// SPDX-License-Identifier: MIT

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/automation/AutomationCompatible.sol";

pragma solidity ^0.8.0;

error LOTTERY__INSUFFICIENT_ETH();
error LOTTERY__TRANSFER_FAILED();
error LOTTERY__REQUEST_NONEXISTENT();
error LOTTERY__NOT_OPEN();
error LOTTERY__UPKEEP_NOT_NEEDED(
    uint _contractBalance,
    uint _numOfPlayers,
    uint _lotteryState,
    uint _timestamp
);

/**
 * @title Lottery
 * @dev A smart contract for conducting a decentralized and automated lottery using Chainlink VRF and Keepers Oracle Services.
 */

contract Lottery is VRFConsumerBaseV2, AutomationCompatible {
    //events
    event LotteryEntered(address indexed _participant, uint _value);
    event RequestSent(uint256 _requestId);
    event RequestFulfilled(uint256 _requestId, uint256 _randomWords);

    enum LotteryStates {
        OPEN,
        CLOSED
    }

    struct RequestStatus {
        bool fulfilled;
        bool exists;
    }

    // state variables
    LotteryStates private s_lotteryStates;
    mapping(uint256 => RequestStatus) private s_requests;
    uint256[] public s_requestIds;
    uint256 public s_lastRequestId;
    address private s_winneraddress;
    uint private immutable i_entranceFee;
    address payable[] private s_players;
    VRFCoordinatorV2Interface public s_vrfCoordinator;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;
    uint64 private immutable i_subId;
    bytes32 private immutable i_keyHash;
    uint32 private immutable i_callbackGasLimit;
    uint private s_lastTimeStamp;
    uint private constant INTERVAL = 30;

    constructor(
        uint _entranceFee,
        address _vrfCoordinator,
        uint64 _subscriptionId,
        bytes32 _keyHash,
        uint32 _callbackGasLimit
    ) VRFConsumerBaseV2(_vrfCoordinator) {
        i_entranceFee = _entranceFee;
        s_vrfCoordinator = VRFCoordinatorV2Interface(_vrfCoordinator);
        i_subId = _subscriptionId;
        i_keyHash = _keyHash;
        i_callbackGasLimit = _callbackGasLimit;
        s_lotteryStates = LotteryStates.OPEN;
        s_lastTimeStamp = block.timestamp;
    }

    modifier isRequestExistent(uint _requestId) {
        if (!s_requests[_requestId].exists) {
            revert LOTTERY__REQUEST_NONEXISTENT();
        }
        _;
    }

    function enterLottery() external payable {
        if (s_lotteryStates == LotteryStates.CLOSED) {
            revert LOTTERY__NOT_OPEN();
        }
        if (msg.value < i_entranceFee) {
            revert LOTTERY__INSUFFICIENT_ETH();
        }

        s_players.push(payable(msg.sender));
        emit LotteryEntered(msg.sender, msg.value);
    }

    /**
     * @dev Function to check if upkeep is needed to be performed on the contract by Chainlink Keepers
     * @param /*checkData- Not used in this implementation
     */

    function checkUpkeep(
        bytes memory /*checkData*/
    )
        public
        view
        override
        returns (bool upkeepNeeded, bytes memory /*performData*/)
    {
        bool hasEnoughPlayers = s_players.length > 1;
        bool hasEnoughEth = address(this).balance > 0;
        bool hasTimePassed = (block.timestamp - s_lastTimeStamp) > INTERVAL;
        bool isOpen = s_lotteryStates == LotteryStates.OPEN;

        upkeepNeeded = (hasEnoughPlayers &&
            hasEnoughEth &&
            hasTimePassed &&
            isOpen);
    }

    function performUpkeep(bytes calldata /*performData*/) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert LOTTERY__UPKEEP_NOT_NEEDED(
                address(this).balance,
                s_players.length,
                uint(s_lotteryStates),
                s_lastTimeStamp
            );
        }
        s_lotteryStates = LotteryStates.CLOSED;
        requestRandomWinner();
    }

    function requestRandomWinner() internal returns (uint requestId) {
        requestId = s_vrfCoordinator.requestRandomWords(
            i_keyHash,
            i_subId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        s_requests[requestId] = RequestStatus(false, true);
        s_requestIds.push(requestId);
        s_lastRequestId = requestId;
        emit RequestSent(requestId);
    }

    /**
     * @dev Function to fulfill random words thus, return random number by the VRFCordinator through the VRF Chainlink Service
     * @param requestId The ID of the request made
     * @param randomWords The random words generated by the VRF
     */

    function fulfillRandomWords(
        uint256 requestId,
        uint256[] memory randomWords
    ) internal override isRequestExistent(requestId) {
        s_requests[requestId].fulfilled = true;
        address payable randomWinner = s_players[
            randomWords[0] % s_players.length
        ];
        s_winneraddress = randomWinner;
        (bool success, ) = randomWinner.call{value: address(this).balance}("");
        if (!success) {
            revert LOTTERY__TRANSFER_FAILED();
        }
        s_lastTimeStamp = block.timestamp;
        s_players = new address payable[](0);
        s_lotteryStates = LotteryStates.OPEN;

        emit RequestFulfilled(requestId, randomWords[0]);
    }

    //getter/view/pure functions

    function getRequestStatus(
        uint _requestId
    ) public view isRequestExistent(_requestId) returns (bool) {
        RequestStatus memory request = s_requests[_requestId];
        return request.fulfilled;
    }

    function getEntranceFee() public view returns (uint) {
        return i_entranceFee;
    }

    function getWinner() public view returns (address) {
        return s_winneraddress;
    }

    function getLastRequestId() public view returns (uint) {
        return s_lastRequestId;
    }

    function getRequestIds(uint _index) public view returns (uint) {
        return s_requestIds[_index];
    }

    function getLastTimeStamp() public view returns (uint) {
        return s_lastTimeStamp;
    }

    function getPlayer(uint index) public view returns (address) {
        return s_players[index];
    }

    function getLotteryState() public view returns (LotteryStates) {
        return s_lotteryStates;
    }

    function getNumberOfPlayers() public view returns (uint) {
        return s_players.length;
    }

    function getContractBalance() public view returns (uint) {
        return address(this).balance;
    }
}
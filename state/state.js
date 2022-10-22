// STATE
const fs = require('fs').promises;

const { PERSISTED_STATE_FILE } = process.env;
const stateFilePath = PERSISTED_STATE_FILE || './state/saved/state.json';
const STATE_ACTIONS = {
  INITIALIZE_STATE: 'INITIALIZE_STATE',
  UPDATE_MIN_RSI: 'UPDATE_MIN_RSI',
};

const initializeState = async () => {
  let state;
  console.log(`Initializing state...`);
  const persistedState = await loadPersistedState();
  if (persistedState) {
    console.log(`Successfully loaded state file`);
    state = JSON.parse(JSON.stringify(persistedState));
  } else {
    // Initialize state
    console.log(`State file not found, initializing new state`);
    state = updateState({}, STATE_ACTIONS.INITIALIZE_STATE, {});
  }
  return state;
};

/**
 * Update state applying an action
 * @param {*} oldState
 * @param {*} action
 * @param {*} data
 * @returns
 */
const updateState = (oldState, action, data) => {
  let newStateAttributes = {};
  switch (action) {
    case STATE_ACTIONS.INITIALIZE_STATE:
      newStateAttributes = { minRSI: {} };
      break;

    case STATE_ACTIONS.UPDATE_MIN_RSI:
      const { tradingPair, rsiVal } = data;
      newStateAttributes = { minRSI: updateMinRSI(oldState, tradingPair, rsiVal) };
      break;

    default:
      break;
  }
  return {
    ...oldState,
    ...newStateAttributes,
    lastUpdated: new Date().toISOString(),
    lastUpdateAction: action,
  };
};

/**
 * Persist state to a file
 * @param {*} state
 */
const persistState = async state => {
  try {
    await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('Error persisting state to file', error);
  }
};

// Private methods

/**
 * Load persisted state from file
 * @returns
 */
const loadPersistedState = async () => {
  try {
    const state = await fs.readFile(stateFilePath, 'utf8');
    if (state) {
      return JSON.parse(state);
    }
    return false;
  } catch (error) {
    console.error('Error loaading state from file', error);
  }
};

/**
 * Update minimum RSI value for a trading pair in a moment in time
 * @param {*} state
 * @param {*} pair
 * @param {*} rsiValue
 */
const updateMinRSI = (state, tradingPair, rsiValue) => {
  console.log(`Update Min RSI for tradingPair ${tradingPair} - RSI(14): ${rsiValue}`);
  const minRSI = JSON.parse(JSON.stringify(state.minRSI));
  const timestamp = new Date().toISOString();
  const NEW_MIN_RSI = {
    minRSIValue: rsiValue,
    minRSIValueTimestamp: timestamp,
    lastRSIValue: rsiValue,
    lastRSIValueTimestamp: timestamp,
  };

  const existingTradingPair = state.minRSI[tradingPair];
  console.log('existingTradingPair', existingTradingPair);
  if (existingTradingPair) {
    if (rsiValue < existingTradingPair.minRSIValue) {
      minRSI[tradingPair] = { ...NEW_MIN_RSI };
    } else {
      minRSI[tradingPair] = { ...minRSI[tradingPair], lastRSIValue: rsiValue, lastRSIValueTimestamp: timestamp };
    }
  } else {
    console.log(`No registered min RSI for trading pair ${tradingPair} - RSI(14): ${rsiValue}`);
    minRSI[tradingPair] = { ...NEW_MIN_RSI };
  }
  return minRSI;
};

module.exports = {
  STATE_ACTIONS,
  initializeState,
  updateState,
  persistState,
  loadPersistedState,
};

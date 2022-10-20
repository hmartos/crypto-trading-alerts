const tradingIndicators = require('trading-indicator');
const nodemailer = require('nodemailer');
const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs').promises;

const { createEmailTemplate } = require('./email-template');

// Constants
const EXCHANGE = 'binance';
const OVERBOUGHT_THRESHOLD = 75;
const OVERSOLD_THRESHOLD = 25;
const STATE_ACTIONS = {
  INITIALIZE_STATE: 'INITIALIZE_STATE',
  UPDATE_MIN_RSI: 'UPDATE_MIN_RSI',
};

// Configuration
dotenv.config();
const { SENDER_EMAIL_ADDRESS, SENDER_EMAIL_PASSWORD, RECEIVER_EMAIL_ADDRESS, PERSISTED_STATE_FILE } = process.env;
// TODO Load state from persisted file
const stateFilePath = PERSISTED_STATE_FILE || './state/saved/state.json';

// State
let state;
// Example: {minRSI: {ETHBUSD: {minRSIValue: 23.67, minRSIValueTimestamp: '2022-10-10T00:00:02', lastRSIValue: 23.52, minRSIValueTimestamp: '2022-10-09T20:00:02'}}}

// Configuration checks
if (!SENDER_EMAIL_ADDRESS || !SENDER_EMAIL_PASSWORD) {
  console.warn('No email sender configuration found!');
}
if (!RECEIVER_EMAIL_ADDRESS) {
  console.warn('No email recipients configuration found!');
}

// Main
const main = async () => {
  try {
    //loadState()
    //const tradingSymbols = symbolStrategies.getEURSQuoteAssetymbols()
    //const symbolsForAlerts = selectionStrategies.overSoldSymbols(tradingSymbols, OVERSOLD_THRESHOLD)
    //alertStrategies.sendEmailAlert(symbolsForAlerts, template)

    // Load state
    const persistedState = await loadPersistedState();
    if (persistedState) {
      state = JSON.parse(JSON.stringify(persistedState));
    } else {
      state = {
        minRSI: {},
        lastUpdated: new Date().toISOString(),
        lastUpdateAction: STATE_ACTIONS.INITIALIZE_STATE,
      };
    }

    // Get list of symbols for alerts
    console.log(`Running alert strategies on ${new Date().toString()}`);
    const overSoldPairs = [];
    console.log('Getting symbols for trading...');
    const tradingSymbols = await getTradingSymbols();
    console.log(`Iterating over ${tradingSymbols.length} trading pairs`, tradingSymbols);

    // Iterate over all tradingSymbols executing the strategy to see if they are selected
    // to generate alerts (OverSold strategy in this case
    for (let i = 0; i < tradingSymbols.length; i++) {
      try {
        const tradingPair = tradingSymbols[i];
        console.log(`Iterating trading pair '${tradingPair}'`);
        const rsiCheck = await getRSIOverSoldOverBoughtCheck(tradingPair);
        const { overSold, rsiVal } = rsiCheck;
        console.log(`RSI OverSold/OverBought Check for trading pair '${tradingPair}'`, rsiCheck);

        // Select overSold pairs
        if (overSold) {
          console.log(`OverSold, it may be a good moment to buy ${tradingPair}!`);
          overSoldPairs.push({ tradingPair, rsiVal });
        }

        // TODO Extract to a function updateState(action: STATE_ACTIONS, tradingPair, rsiVal)
        state = {
          ...state,
          minRSI: updateMinRSI(tradingPair, rsiVal),
          lastUpdated: new Date().toISOString(),
          lastUpdateAction: STATE_ACTIONS.UPDATE_MIN_RSI,
        };
        console.log('State', state);
      } catch (error) {
        console.error(`Error getting RSI check`, error);
      }
    }

    console.log(`There are ${overSoldPairs.length} overSold trading pairs`, overSoldPairs);
    if (overSoldPairs.length > 0) {
      console.log('Sending overSold alerts by email');
      sendOverSoldAlertByEmail(overSoldPairs, EXCHANGE);
    }
    console.log(`Finished alert strategies on ${new Date().toString()}`);
    //TODO Persist state
    persistState();
  } catch (error) {
    console.error('Error generating cyrptocurrency trading alerts', error);
  }
};

// Functions
/**
 * Get OverSold/OverBougth RSI check
 * @returns
 */
const getRSIOverSoldOverBoughtCheck = async (
  tradingPair,
  OverBoughtThreshold = OVERBOUGHT_THRESHOLD,
  overSoldThreshold = OVERSOLD_THRESHOLD
) => {
  try {
    const rsiCheck = await tradingIndicators.rsiCheck(
      14,
      OverBoughtThreshold,
      overSoldThreshold,
      EXCHANGE,
      tradingPair,
      '1d',
      false
    );
    return { tradingPair, ...rsiCheck };
  } catch (error) {
    console.error('Error getting OverSold/OverBought check', error);
  }
};

/**
 * Send OverSold alert by email
 * @param {*} tradingPairs
 * @param {*} exchange
 */
const sendOverSoldAlertByEmail = async (tradingPairs, exchange) => {
  try {
    if (!SENDER_EMAIL_ADDRESS || !SENDER_EMAIL_PASSWORD || !RECEIVER_EMAIL_ADDRESS) {
      console.log('Incomplete email configuration, will not send email. Review your configuration!');
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SENDER_EMAIL_ADDRESS,
        pass: SENDER_EMAIL_PASSWORD,
      },
    });
    // TODO Avisar si
    // - El RSI es menor que que threshold y es la primera vez que pasa desde T - ALERT_TIME_THRESHOLD
    // - El RSI es menor que el último RSI registrado en T - ALERT_TIME_THRESHOLD
    //const tradingPairs4Alert = filterTradingPair4Alert(tradingPairs, state);
    //console.log(tradingPairs4Alert);
    const template = createEmailTemplate(tradingPairs);

    //https://log.bntrace.com/bapi/composite/v1/public/message/view-url?_bEt=eyJhbGciOiJIUzI1NiJ9.eyJjdCI6ImJyIiwiYiI6IjEwMDQ2OTkiLCJyIjoiYm5jOi8vYXBwLmJpbmFuY2UuY29tL3BheW1lbnQvZnVuZHM_dXRtX2NhbXBhaWduPVBheUMyQ19HbG9iYWwmdXRtX21lZGl1bT1FbWFpbCZ1dG1fc291cmNlPUNSTSIsInMiOiJUQUciLCJzZXEiOjIwMDE4NywidHMiOjE2NTA1NjU1NDM5NjR9.ni2XNU0O6RSOFvwl4kNNdz2acfJm7R9nBTrdyXLim-M

    const mailOptions = {
      from: `"Crypto Trading Alerts" <${SENDER_EMAIL_ADDRESS}>`, // sender address
      to: RECEIVER_EMAIL_ADDRESS, // list of receivers
      subject: `Crypto Trading Alerts`, // Subject line
      html: template,
    };

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);

    console.log('Alerts sent', info, template);
  } catch (error) {
    console.error('Error sending OverSold email alert', error);
  }
};

/**
 * Get trading symbols
 */
const getTradingSymbols = async () => {
  try {
    const exchangeInfo = await axios.request({
      url: `https://api.binance.com/api/v3/exchangeInfo`,
    });
    const { symbols } = exchangeInfo.data;

    const normalizedSymbols = symbols
      .filter(symbol => {
        return symbol.status === 'TRADING' && symbol.quoteAsset === 'EUR'; //|| symbol.quoteAsset === "ETH")
      })
      .map(symbol => {
        return symbol.symbol;
      });
    return normalizedSymbols;
  } catch (error) {
    console.error('Error getting trading symbols', error);
  }
};

// STATE
/**
 * Persist state to a file
 */
const persistState = async () => {
  try {
    await fs.writeFile(stateFilePath, JSON.stringify(state, null, 2), 'utf8');
  } catch (error) {
    console.error('Error persisting state to file', error);
  }
};

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
 * @param {*} pair
 * @param {*} rsiValue
 */
const updateMinRSI = (tradingPair, rsiValue) => {
  console.log(`Update Min RSI for tradingPair ${tradingPair} - RSI(14): ${rsiValue}. State before: `, state);
  const newMinRSI = JSON.parse(JSON.stringify(state.minRSI));
  console.log('newMinRSI', newMinRSI);

  const existingTradingPair = state.minRSI[tradingPair];
  console.log('existingTradingPair', existingTradingPair);
  if (existingTradingPair) {
    if (rsiValue < existingTradingPair.rsiValue) {
      newMinRSI[tradingPair].minRSIValue = rsiValue;
      newMinRSI[tradingPair].minRSIValueTimestamp = new Date().toISOString();
      newMinRSI[tradingPair].lastRSIValue = rsiValue;
      newMinRSI[tradingPair].lastRSIValueTimestamp = new Date().toISOString();
    } else {
      newMinRSI[tradingPair].lastRSIValue = rsiValue;
      newMinRSI[tradingPair].lastRSIValueTimestamp = new Date().toISOString();
    }
  } else {
    console.log(`No registrered min RSI for trading pair ${tradingPair} - RSI(14): ${rsiValue}`);
    newMinRSI[tradingPair] = { lastRSIValue: rsiValue, lastRSIValueTimestamp: new Date().toISOString() };
  }
  console.log('newMinRSI', newMinRSI);
  return newMinRSI;
};

main();

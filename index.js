const tradingIndicators = require('trading-indicator');
const nodemailer = require('nodemailer');
const axios = require('axios');
const dotenv = require('dotenv');

const { createEmailTemplate } = require('./email-template');

dotenv.config();

// Constants
const EXCHANGE = 'binance';
const OVERBOUGHT_THRESHOLD = 75;
const OVERSOLD_THRESHOLD = 25;

const { SENDER_EMAIL_ADDRESS, SENDER_EMAIL_PASSWORD, RECEIVER_EMAIL_ADDRESS } =
  process.env;
if (!SENDER_EMAIL_ADDRESS || !SENDER_EMAIL_PASSWORD) {
  console.warn('No email sender configuration found!');
}
if (!RECEIVER_EMAIL_ADDRESS) {
  console.warn('No email recipients configuration found!');
}

// Main
const main = async () => {
  try {
    console.log(`Running alert strategies on ${new Date().toString()}`);
    const overSoldPairs = [];
    console.log('Getting symbols for trading...');
    const tradingSymbols = await getTradingSymbols();
    console.log(
      `Iterating over ${tradingSymbols.length} trading pairs`,
      tradingSymbols
    );

    // Iterate over all tradingSymbols to see if they are OverSold
    for (let i = 0; i < tradingSymbols.length; i++) {
      try {
        const tradingPair = tradingSymbols[i];
        console.log(`Iterating trading pair '${tradingPair}'`);
        const rsiCheck = await getRSIOverSoldOverBoughtCheck(tradingPair);
        const { overSold, rsiVal } = rsiCheck;
        console.log(
          `RSI OverSold/OverBought Check for trading pair '${tradingPair}'`,
          rsiCheck
        );

        // Select overSold pairs
        if (overSold) {
          console.log(
            `OverSold, it may be a good moment to buy ${tradingPair}!`
          );
          overSoldPairs.push({ tradingPair, rsiVal });
        }
      } catch (error) {
        console.error(
          `Error getting RSI check on trading pair '${tradingPair}'`,
          error
        );
      }
    }

    console.log(
      `There are ${overSoldPairs.length} overSold trading pairs`,
      overSoldPairs
    );
    if (overSoldPairs.length > 0) {
      console.log('Sending overSold alerts by email');
      sendOverSoldAlertByEmail(overSoldPairs, EXCHANGE);
    }
    console.log(`Finished alert strategies on ${new Date().toString()}`);
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
    if (
      !SENDER_EMAIL_ADDRESS ||
      !SENDER_EMAIL_PASSWORD ||
      !RECEIVER_EMAIL_ADDRESS
    ) {
      console.log(
        'Incomplete email configuration, will not send email. Review your configuration!'
      );
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SENDER_EMAIL_ADDRESS,
        pass: SENDER_EMAIL_PASSWORD,
      },
    });
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

main();

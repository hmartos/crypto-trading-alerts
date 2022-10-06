const tradingIndicators = require('trading-indicator');
const nodemailer = require("nodemailer");
const axios = require("axios");
const dotenv = require('dotenv')

dotenv.config();

// Constants
const EXCHANGE = "binance";

const {SENDER_EMAIL_ADDRESS, SENDER_EMAIL_PASSWORD, RECEIVER_EMAIL_ADDRESS} = process.env;
if (!SENDER_EMAIL_ADDRESS || !SENDER_EMAIL_PASSWORD) {
  console.warn("No email sender configuration found!")
}
if (!RECEIVER_EMAIL_ADDRESS) {
  console.warn("No email recipients configuration found!")
}


// Main
const main = async () => {
  try {
    console.log(`Running alert strategies on ${new Date().toString()}`);
    const overSoldPairs = [];
    console.log("Getting symbols for trading...");
    const tradingSymbols = await getTradingSymbols();
    console.log(`Iterating over ${tradingSymbols.length} trading pairs`, tradingSymbols);

    // Iterate over all tradingSymbols to see if they are OverSold
    for (let i = 0; i < tradingSymbols.length; i++) {
      try {
        const tradingPair = tradingSymbols[i];
        console.log(`Iterating trading pair '${tradingPair}'`);
        const rsiCheck = await getRSIOverSoldOverBoughtCheck(tradingPair);
        const {overSold, rsiVal} = rsiCheck;
        console.log(`RSI OverSold/OverBought Check for trading pair '${tradingPair}'`, rsiCheck);

        // Select overSold pairs
        if (overSold) {
          console.log(`OverSold, it may be a good moment to buy ${tradingPair}!`);
          overSoldPairs.push({tradingPair, rsiVal});
        }
      } catch (error) {
        console.error(`Error getting RSI check on trading pair '${tradingPair}'`, error);
      }
    }

    console.log(`There are ${overSoldPairs.length} overSold trading pairs`, overSoldPairs)
    if (overSoldPairs.length > 0) {
      console.log("Sending overSold alerts by email")
      sendOverSoldAlertByEmail(overSoldPairs, EXCHANGE);
    }
    console.log(`Finished alert strategies on ${new Date().toString()}`);
   
  } catch (error) {
    console.error("Error generating cyrptocurrency trading alerts", error);
  }
}

// Functions
/**
 * Get OverSold/OverBougth RSI check
 * @returns 
 */
const getRSIOverSoldOverBoughtCheck = async (tradingPair, OverBoughtThreshold = 70,  overSoldThreshold = 30 ) => {
  try {
    const rsiCheck = await tradingIndicators.rsiCheck(14, OverBoughtThreshold, overSoldThreshold, EXCHANGE, tradingPair, '1d', false);
    return {tradingPair, ...rsiCheck};
  } catch (error) {
    console.error("Error getting OverSold/OverBought check", error)
  }
}

/**
 * Send OverSold alert by email
 * @param {*} tradingPairs 
 * @param {*} exchange 
 */
const sendOverSoldAlertByEmail = async (tradingPairs, exchange) => {
  try {
    if (!SENDER_EMAIL_ADDRESS || !SENDER_EMAIL_PASSWORD || !RECEIVER_EMAIL_ADDRESS) {
      console.log("Incomplete email configuration, will not send email. Review your configuration!")
      return;
    }
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: SENDER_EMAIL_ADDRESS,
        pass: SENDER_EMAIL_PASSWORD
      }
    });

    const template = `
    <!doctype html>

    <html>

      <head>

        <meta name="viewport" content="width=device-width, initial-scale=1.0" />

        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />

        <title>Simple Transactional Email</title>

        <style>
          /* -------------------------------------

              GLOBAL RESETS

          ------------------------------------- */



          /*All the styling goes here*/



          img {

            border: none;

            -ms-interpolation-mode: bicubic;

            max-width: 100%;

          }




          body {

            background-color: #f6f6f6;

            font-family: sans-serif;

            -webkit-font-smoothing: antialiased;

            font-size: 14px;

            line-height: 1.4;

            margin: 0;

            padding: 0;

            -ms-text-size-adjust: 100%;

            -webkit-text-size-adjust: 100%;

          }




          table {

            border-collapse: separate;

            mso-table-lspace: 0pt;

            mso-table-rspace: 0pt;

            width: 100%;
          }

          table td {

            font-family: sans-serif;

            font-size: 14px;

            vertical-align: top;

          }




          /* -------------------------------------

              BODY & CONTAINER

          ------------------------------------- */




          .body {

            background-color: #f6f6f6;

            width: 100%;

          }




          /* Set a max-width, and make it display as block so it will automatically stretch to that width, but will also shrink down on a phone or something */

          .container {

            display: block;

            margin: 0 auto !important;

            /* makes it centered */

            max-width: 580px;

            padding: 10px;

            width: 580px;

          }




          /* This should also be a block element, so that it will fill 100% of the .container */

          .content {

            box-sizing: border-box;

            display: block;

            margin: 0 auto;

            max-width: 580px;

            padding: 10px;

          }




          /* -------------------------------------

              HEADER, FOOTER, MAIN

          ------------------------------------- */

          .main {

            background: #ffffff;

            border-radius: 3px;

            width: 100%;

          }




          .wrapper {

            box-sizing: border-box;

            padding: 20px;

          }




          .content-block {

            padding-bottom: 10px;

            padding-top: 10px;

          }




          .footer {

            clear: both;

            margin-top: 10px;

            text-align: center;

            width: 100%;

          }

          .footer td,

          .footer p,

          .footer span,

          .footer a {

            color: #999999;

            font-size: 12px;

            text-align: center;

          }




          /* -------------------------------------

              TYPOGRAPHY

          ------------------------------------- */

          h1,

          h2,

          h3,

          h4 {

            color: #000000;

            font-family: sans-serif;

            font-weight: 400;

            line-height: 1.4;

            margin: 0;

            margin-bottom: 30px;

          }




          h1 {

            font-size: 35px;

            font-weight: 300;

            text-align: center;

            text-transform: capitalize;

          }




          p,

          ul,

          ol {

            font-family: sans-serif;

            font-size: 14px;

            font-weight: normal;

            margin: 0;

            margin-bottom: 15px;

          }

          p li,

          ul li,

          ol li {

            list-style-position: inside;

            margin-left: 5px;

          }




          a {

            color: #3498db;

            text-decoration: underline;

          }




          /* -------------------------------------

              BUTTONS

          ------------------------------------- */

          .btn {

            box-sizing: border-box;

            width: 100%;
          }

          .btn>tbody>tr>td {

            padding-bottom: 15px;
          }

          .btn table {

            width: auto;

          }

          .btn table td {

            background-color: #ffffff;

            border-radius: 5px;

            text-align: center;

          }

          .btn a {

            background-color: #ffffff;

            border: solid 1px #3498db;

            border-radius: 5px;

            box-sizing: border-box;

            color: #3498db;

            cursor: pointer;

            display: inline-block;

            font-size: 14px;

            font-weight: bold;

            margin: 0;

            padding: 12px 25px;

            text-decoration: none;

            text-transform: capitalize;

          }




          .btn-primary table td {

            background-color: #3498db;

          }




          .btn-primary a {

            background-color: #3498db;

            border-color: #3498db;

            color: #ffffff;

          }




          /* -------------------------------------

              OTHER STYLES THAT MIGHT BE USEFUL

          ------------------------------------- */

          .last {

            margin-bottom: 0;

          }




          .first {

            margin-top: 0;

          }




          .align-center {

            text-align: center;

          }




          .align-right {

            text-align: right;

          }




          .align-left {

            text-align: left;

          }




          .clear {

            clear: both;

          }




          .mt0 {

            margin-top: 0;

          }




          .mb0 {

            margin-bottom: 0;

          }




          .preheader {

            color: transparent;

            display: none;

            height: 0;

            max-height: 0;

            max-width: 0;

            opacity: 0;

            overflow: hidden;

            mso-hide: all;

            visibility: hidden;

            width: 0;

          }




          .powered-by a {

            text-decoration: none;

          }




          hr {

            border: 0;

            border-bottom: 1px solid #f6f6f6;

            margin: 20px 0;

          }




          /* -------------------------------------

              RESPONSIVE AND MOBILE FRIENDLY STYLES

          ------------------------------------- */

          @media only screen and (max-width: 620px) {

            table.body h1 {

              font-size: 28px !important;

              margin-bottom: 10px !important;

            }

            table.body p,

            table.body ul,

            table.body ol,

            table.body td,

            table.body span,

            table.body a {

              font-size: 16px !important;

            }

            table.body .wrapper,

            table.body .article {

              padding: 10px !important;

            }

            table.body .content {

              padding: 0 !important;

            }

            table.body .container {

              padding: 0 !important;

              width: 100% !important;

            }

            table.body .main {

              border-left-width: 0 !important;

              border-radius: 0 !important;

              border-right-width: 0 !important;

            }

            table.body .btn table {

              width: 100% !important;

            }

            table.body .btn a {

              width: 100% !important;

            }

            table.body .img-responsive {

              height: auto !important;

              max-width: 100% !important;

              width: auto !important;

            }

          }




          /* -------------------------------------

              PRESERVE THESE STYLES IN THE HEAD

          ------------------------------------- */

          @media all {

            .ExternalClass {

              width: 100%;

            }

            .ExternalClass,

            .ExternalClass p,

            .ExternalClass span,

            .ExternalClass font,

            .ExternalClass td,

            .ExternalClass div {

              line-height: 100%;

            }

            .apple-link a {

              color: inherit !important;

              font-family: inherit !important;

              font-size: inherit !important;

              font-weight: inherit !important;

              line-height: inherit !important;

              text-decoration: none !important;

            }

            #MessageViewBody a {

              color: inherit;

              text-decoration: none;

              font-size: inherit;

              font-family: inherit;

              font-weight: inherit;

              line-height: inherit;

            }

            .btn-primary table td:hover {

              background-color: #34495e !important;

            }

            .btn-primary a:hover {

              background-color: #34495e !important;

              border-color: #34495e !important;

            }

          }

        </style>

      </head>

      <body>

        <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="body">

          <tr>

            <td>&nbsp;</td>

            <td class="container">

              <div class="content">


                <!-- START CENTERED WHITE CONTAINER -->

                <table role="presentation" class="main">




                  <!-- START MAIN CONTENT AREA -->

                  <tr>

                    <td class="wrapper">

                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">

                        <tr>

                          <td>
                            <h1 style="margin-bottom: 25px !important;">OverSold trading pairs on Binance</h1>

                            <table>
                              <thead>
                                <th>Pair</th>
                                <th>RSI</th>
                                <th>Action</th>
                              </thead>
                              <tbody>
                               ${tradingPairs.map((tradingPair) => {
              return ` <tr style="margin:10px">
                                  <td>${tradingPair.tradingPair}</td>
                                  <td>${tradingPair.rsiVal}</td>
                                  <td>
                                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" class="btn btn-primary">

                                      <tbody>

                                        <tr>

                                          <td align="left">

                                            <table role="presentation" border="0" cellpadding="0" cellspacing="0">

                                              <tbody>

                                                <tr>

                                                  <td> <a href="https://next-ios-deeplink.vercel.app/api/ios-deeplink?pair=${tradingPair.tradingPair}" target="_blank">

                                                  Trade on Binance
                                                  </a> </td>

                                                </tr>

                                              </tbody>

                                            </table>

                                          </td>

                                        </tr>

                                      </tbody>

                                    </table>
                                  </td>
                                </tr>`
                    }).join('')}
                              </tbody>
                            </table>

                          </td>

                        </tr>

                      </table>

                    </td>

                  </tr>


                  <!-- END MAIN CONTENT AREA -->

                </table>

                <!-- END CENTERED WHITE CONTAINER -->




                <!-- START FOOTER -->

                <div class="footer">

                  <table role="presentation" border="0" cellpadding="0" cellspacing="0">

                    <tr>

                      <td class="content-block">

                        <span class="apple-link">crypto-trading-alerts</span>

                        <br> by <a href="https://github.com/hmartos">hmartos</a>.

                      </td>

                    </tr>


                  </table>

                </div>

                <!-- END FOOTER -->




              </div>

            </td>

            <td>&nbsp;</td>

          </tr>

        </table>

      </body>

    </html>`

    //https://log.bntrace.com/bapi/composite/v1/public/message/view-url?_bEt=eyJhbGciOiJIUzI1NiJ9.eyJjdCI6ImJyIiwiYiI6IjEwMDQ2OTkiLCJyIjoiYm5jOi8vYXBwLmJpbmFuY2UuY29tL3BheW1lbnQvZnVuZHM_dXRtX2NhbXBhaWduPVBheUMyQ19HbG9iYWwmdXRtX21lZGl1bT1FbWFpbCZ1dG1fc291cmNlPUNSTSIsInMiOiJUQUciLCJzZXEiOjIwMDE4NywidHMiOjE2NTA1NjU1NDM5NjR9.ni2XNU0O6RSOFvwl4kNNdz2acfJm7R9nBTrdyXLim-M

    const mailOptions = {
      from: `"Crypto Trading Alerts" <${SENDER_EMAIL_ADDRESS}>`, // sender address
      to: RECEIVER_EMAIL_ADDRESS, // list of receivers
      subject: `Crypto Trading Alerts`, // Subject line
      html: template
    }

    // send mail with defined transport object
    let info = await transporter.sendMail(mailOptions);

    console.log("Alerts sent", info, template);
  } catch (error) {
    console.error("Error sending OverSold email alert", error)
  }
}

/**
 * Get trading symbols
 */
const getTradingSymbols = async () => {
  try {
    const exchangeInfo = await axios.request({
      url: `https://api.binance.com/api/v3/exchangeInfo`,
    });
    const {symbols} = exchangeInfo.data;

    const normalizedSymbols = symbols.filter((symbol)=> {
      return symbol.status === "TRADING" && (symbol.quoteAsset === "EUR" )//|| symbol.quoteAsset === "ETH")
    }).map((symbol)=>{
      return symbol.symbol
    })
    return normalizedSymbols;
  } catch (error) {
    console.error("Error getting trading symbols", error)
  }
}

//main();

sendOverSoldAlertByEmail([{tradingPair: "ETHEUR", rsiVal: 24.4}, {tradingPair: "NEAREUR", rsiVal: 28.8}])
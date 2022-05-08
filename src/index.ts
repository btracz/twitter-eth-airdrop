import dayjs from "dayjs";
import { isEmpty } from "lodash";
import needle from "needle";
import config from "../config.json";

// The code below sets the bearer token from your environment variables
// To set environment variables on macOS or Linux, run the export command below from the terminal:
// export BEARER_TOKEN='YOUR-TOKEN'
const { token } = config.twitter;
// Open a realtime stream of Tweets, filtered according to rules
// https://developer.twitter.com/en/docs/twitter-api/tweets/filtered-stream/quick-start

import { getTweetDetails } from "./twitter";
import { RulesResponse } from "./types/twitter-types";

const rulesURL = "https://api.twitter.com/2/tweets/search/stream/rules";
const streamURL = "https://api.twitter.com/2/tweets/search/stream";

const processTweet = async (id: string) => {
  // find tweet details and parent tweet
  const tweet = await getTweetDetails(id);
  if (!tweet) {
    console.warn("Unknown tweet", id);
    return;
  }
  /* console.log(
    dayjs().format,
    "Tweet details",
    JSON.stringify(tweet, null, 2)
  ); */

  if (isEmpty(tweet.referenced_tweets)) {
    console.log(
      `\r\n=============================================================`
    );
    console.log(`Tweet about eth drop : \r\n${tweet.text}`);
    console.log(
      `=============================================================`
    );
  } else {
    console.log("Just a RT or reply");
  }
};

// this sets up two rules - the value is the search terms to match on, and the tag is an identifier that
// will be applied to the Tweets return to show which rule they matched
// with a standard project with Basic Access, you can add up to 25 concurrent rules to your stream, and
// each rule can be up to 512 characters long

// Edit rules as desired below
const rules = [
  {
    value: '"will be giving" ETH (wallet OR address) (follow OR retweet)',
  },
];

async function getAllRules() {
  const response = await needle("get", rulesURL, {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 200) {
    console.log("Error:", response.statusMessage, response.statusCode);
    throw new Error(response.body);
  }

  return response.body;
}

async function deleteAllRules(rules: RulesResponse) {
  if (!Array.isArray(rules.data)) {
    return null;
  }

  const ids = rules.data.map((rule) => rule.id);

  const data = {
    delete: {
      ids: ids,
    },
  };

  const response = await needle("post", rulesURL, data, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 200) {
    throw new Error(response.body);
  }

  return response.body;
}

async function setRules() {
  const data = {
    add: rules,
  };

  const response = await needle("post", rulesURL, data, {
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
  });

  if (response.statusCode !== 201) {
    throw new Error(JSON.stringify(response.body));
  }

  return response.body;
}

function streamConnect(retryAttempt: number) {
  const stream = needle.get(streamURL, {
    headers: {
      "User-Agent": "v2FilterStreamJS",
      Authorization: `Bearer ${token}`,
    },
    timeout: 20000,
  });

  stream
    .on("data", async (data) => {
      try {
        const json = JSON.parse(data);
        // console.log(dayjs().format, "Elon's tweet payload", json);

        if (json.errors) {
          console.warn(json.errors);
        } else if (json.data?.id) {
          try {
            await processTweet(json.data.id);
          } catch (error) {
            console.error(
              "Error while processing",
              json,
              "=> details :",
              error
            );
          }
        } else {
          console.error("Unprocessable data", json);
        }

        // A successful connection resets retry count.
        retryAttempt = 0;
      } catch (e) {
        if (
          data.detail ===
          "This stream is currently at the maximum allowed connection limit."
        ) {
          console.log(data.detail);
          process.exit(1);
        } else {
          // Keep alive signal received. Do nothing.
        }
      }
    })
    .on("err", (error) => {
      if (error.code !== "ECONNRESET") {
        console.log(error.code);
        process.exit(1);
      } else {
        // This reconnection logic will attempt to reconnect when a disconnection is detected.
        // To avoid rate limits, this logic implements exponential backoff, so the wait time
        // will increase if the client cannot reconnect to the stream.
        setTimeout(() => {
          console.warn("A connection error occurred. Reconnecting...");
          streamConnect(++retryAttempt);
        }, 2 ** retryAttempt);
      }
    });

  return stream;
}

// Listening to twitter
(async () => {
  let currentRules;

  try {
    // Gets the complete list of rules currently applied to the stream
    currentRules = await getAllRules();
    // Delete all rules. Comment the line below if you want to keep your existing rules.
    await deleteAllRules(currentRules);
    // Add rules to the stream. Comment the line below if you don't want to add new rules.
    await setRules();
  } catch (e) {
    console.error("Error with rule", e);
    process.exit(1);
  }

  // Listen to the stream.
  const stream = streamConnect(0);
  console.log("Listening to tweets");

  process.on("beforeExit", () => stream.removeAllListeners());
})();

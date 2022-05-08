import config from "../config.json";
import Twitter from "twitter-v2";
import { MinimalTweet, Tweet, TWEET_TYPES } from "./types/twitter-types";

const twitterClient = new Twitter({
  bearer_token: config?.twitter?.token,
});

export const getTweetDetails = async (id: string) => {
  const { data, includes } = await twitterClient.get("tweets", {
    ids: id,
    expansions: ["referenced_tweets.id", "author_id"],
    "user.fields": ["username", "name"],
  });
  const tweet = { ...data?.[0], ...includes } as Tweet;
  /* if (tweet?.referenced_tweets?.length > 0) {
    const parent = tweet.referenced_tweets.find(
      (t: MinimalTweet) => t.type === TWEET_TYPES.REPLY
    );
    if (parent && parent.id) {
      tweet.parent = await getTweetDetails(parent.id);
    }
    const quotation = tweet.referenced_tweets.find(
      (t: MinimalTweet) => t.type === TWEET_TYPES.QUOTE
    );
    if (quotation && quotation.id) {
      tweet.quotation = await getTweetDetails(quotation.id);
    }
  } */

  return tweet;
};

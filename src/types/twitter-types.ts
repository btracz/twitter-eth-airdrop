export enum TWEET_TYPES {
    REPLY = "replied_to",
    QUOTE = "quoted",
    RETWEET = "retweeted",
  }
  
  export interface MinimalTweet {
    type: TWEET_TYPES;
    id: string;
  }
  
  export interface User {
    id: string;
    name: string;
    username: string;
  }
  
  export interface Tweet extends MinimalTweet {
    text: string;
    parent: Tweet;
    quotation: Tweet;
    author_id: string;
    referenced_tweets: MinimalTweet[];
    users: User[];
    topic?: {
      value: string;
      direct: boolean;
    };
  }
  
  export interface Rule {
    id: string;
  }
  
  export interface RulesResponse {
    data: Rule[];
  }
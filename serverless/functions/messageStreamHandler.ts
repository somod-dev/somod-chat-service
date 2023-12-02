import { DynamoDBStreamHandler } from "aws-lambda";

const streamHandler: DynamoDBStreamHandler = async event => {
  // eslint-disable-next-line no-console
  console.log(event);
};

export default streamHandler;

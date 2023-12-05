import { APIGatewayProxyWebsocketHandlerV2 } from "aws-lambda";

const WebsocketOnMessage: APIGatewayProxyWebsocketHandlerV2 = event => {
  // eslint-disable-next-line no-console
  console.log(event);
};

export default WebsocketOnMessage;

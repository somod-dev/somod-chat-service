import { RouteBuilder, Message } from "somod-websocket-extension";
import { MessageInput } from "../../lib/types";
import { putMessage, validateIncomingMessage } from "../../lib/message";
import { v1 as v1uuid } from "uuid";
import { handleSessionToken } from "../../lib/sessionUtil";
import { getUserIdFromEvent } from "../../lib/getUserIdFromEvent";

const builder = new RouteBuilder();

const typeToAllowedActionsMap = JSON.parse(
  process.env.MAP_OF_TYPE_ACTION ?? "{}"
);

const sessionRequirement = JSON.parse(
  process.env.MAP_OF_TYPE_ACTION_SESSION ?? "{}"
);

builder.add(
  "$default",
  async (message: Message<MessageInput & { wsMsgId: string }>, event) => {
    const userId = getUserIdFromEvent(event);

    const messageValidationError = await validateIncomingMessage(
      message.body,
      userId,
      typeToAllowedActionsMap
    );
    if (messageValidationError) {
      return messageValidationError;
    }

    const sessionIdResult = await handleSessionToken(
      userId,
      message.body.threadId,
      message.body.type,
      message.body.action,
      sessionRequirement,
      message.body.sessionToken
    );
    if (sessionIdResult.error) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          message: sessionIdResult.error,
          threadId: message.body.threadId,
          sessionRequiredTill: sessionIdResult.sessionRequiredTill
        })
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { wsMsgId, sessionToken, ...msg } = message.body;

    const actions = ["sessionStart", "sessionExtend", "sessionEnd"];
    const messageResult = await putMessage(
      process.env.MESSAGE_BOX_TABLE_NAME + "",
      userId,
      {
        ...msg,
        sessionId: sessionIdResult.sessionId,
        from: userId,
        id: v1uuid().split("-").join(""),
        sentAt: Date.now(),
        ...(actions.includes(message.body.action)
          ? { sessionToken: sessionToken }
          : {})
      }
    );

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        wsMsgId,
        type: "ack",
        id: messageResult.id,
        seqNo: messageResult.seqNo,
        sentAt: messageResult.sentAt,
        from: messageResult.from
      })
    };
  }
);

export default builder.getHandler();

import jwt from "jsonwebtoken";

const authorizerSecret = process.env.AUTHORIZER_SECRET || "";

const handleSessionToken = async (
  sessionToken: string,
  userId: string
): Promise<{ sessionId?: string; error?: string; statusCode?: number }> => {
  // handle sessionToken
  let currentToken: {
    status: string;
    sessionId: string;
    exp: number;
    participants: [string];
  };
  let sessionId = "";
  if (authorizerSecret != "") {
    console.log("session support enabled");
    try {
      currentToken = jwt.verify(sessionToken, authorizerSecret + "", {
        algorithms: ["HS512"],
        ignoreExpiration: true
      }) as {
        sessionId: string;
        status: string;
        exp: number;
        participants: [string];
      };
    } catch (err) {
      console.error(
        "invalid session token. userId=" + userId + ", error=" + err
      );
      return {
        statusCode: 401,
        error: "INVALID_TOKEN"
      };
    }

    // TODO: add expiration grace period
    if (Date.now() / 1000 > currentToken.exp) {
      console.error(
        "expired token. userId=" +
          userId +
          ", sessionId=" +
          currentToken.sessionId
      );
      return {
        statusCode: 401,
        error: "EXPIRED_TOKEN"
      };
    }

    if ("ENDED" == currentToken.status) {
      console.error(
        "ended token. userId=" +
          userId +
          ", sessionId=" +
          currentToken.sessionId
      );
      return {
        statusCode: 401,
        error: "ENDED_SESSION"
      };
    }
    // check if the user is allowed to use the token
    const participants = currentToken.participants;
    if (!participants.includes(userId)) {
      console.log(
        "user is not a participant in the token. userId=" +
          userId +
          ", participants=" +
          JSON.stringify(participants)
      );
      return {
        statusCode: 401,
        error: "USER_NOT_VALID_PARTICIPANT"
      };
    }
    // set session id from token
    return {
      sessionId: currentToken.sessionId
    };
  } else {
    console.log("session support not enabled");
    return { sessionId: "" };
  }
};

export default handleSessionToken;

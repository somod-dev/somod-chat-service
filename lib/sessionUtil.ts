import { verify } from "jsonwebtoken";
import { Session, sessionRequirement } from "./types";
import { threadCache } from "./threadCache";

const sessionJwtSecret = process.env.SESSION_SECRET ?? "";
const sessionForce = process.env.SESSION_FORCE ?? "";
type SessionIdResult = {
  sessionId: string;
  error?: string;
  sessionRequiredTill?: number;
};

export const Error = {
  required: "missing required field: sessionToken",
  invalid: "invalid field: sessionToken"
};

export const handleSessionToken = async (
  userId: string,
  threadId: string,
  type: string,
  action: string,
  sessionToken?: string
): Promise<SessionIdResult> => {
  const result: SessionIdResult = { sessionId: "" };
  if (sessionJwtSecret) {
    if (!sessionToken) {
      const isSessionRequiredForThisTypeAction =
        sessionRequirement[type]?.[action];
      if (isSessionRequiredForThisTypeAction !== undefined) {
        const oneDay = Date.now() + 1000 * 60 * 60 * 24; // 1 day
        if (isSessionRequiredForThisTypeAction === "always") {
          result.error = Error.required;
          result.sessionRequiredTill = oneDay;
        } else if (isSessionRequiredForThisTypeAction === "thread") {
          if (sessionForce == "true") {
            result.error = Error.required;
            result.sessionRequiredTill = oneDay;
          } else {
            const thread = await threadCache.get(threadId, -1); // ttl = -1 will force the cache to fetch from db
            const sessionRequired = Object.fromEntries(
              thread?.sessionRequired?.map((userId, index) => [
                userId,
                thread?.sessionRequiredTill?.[index] ?? oneDay
              ]) ?? []
            );
            if (
              sessionRequired[userId] !== undefined &&
              Date.now() < sessionRequired[userId]
            ) {
              result.error = Error.required;
              result.sessionRequiredTill = sessionRequired[userId];
            }
          }
        }
      }
    } else {
      try {
        const session = verify(sessionToken, sessionJwtSecret + "", {
          algorithms: ["HS512"],
          ignoreExpiration: true
        }) as Session;
        const now = Date.now();
        if (
          session.participants.includes(userId) &&
          session.startTime <= now &&
          now <= session.endTime
        ) {
          result.sessionId = session.id;
        } else {
          result.error = Error.invalid;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(
          "session token verification failed. userId=" +
            userId +
            ", error=" +
            err
        );
        result.error = Error.invalid;
      }
    }
  }

  return result;
};

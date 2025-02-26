import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import { cache } from "./cache";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { Thread } from "./types";

const dynamodb = new DynamoDBClient();

const _threadCache = cache(100, 60 * 60000);

export const threadCache = {
  get: async (threadId: string, ttl?: number) => {
    return await _threadCache.get(
      threadId,
      async () => {
        const threadResult = await dynamodb.send(
          new GetItemCommand({
            TableName: process.env.THREAD_TABLE_NAME,
            Key: marshall({ id: threadId })
          })
        );
        return threadResult.Item
          ? (unmarshall(threadResult.Item) as Thread)
          : undefined;
      },
      ttl
    );
  }
};

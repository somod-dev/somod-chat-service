export type ThreadInput = {
  participants: string[];
};

export type Thread = {
  id: string;
} & ThreadInput;

export type MessageInput = {
  threadId: string;
  type: "text";
  action: "new" | "edit" | "delete";
  from: string;
  message: string;
};

export type Message = {
  id: string;
  seqNo: number;
  sentAt: number;
} & MessageInput;

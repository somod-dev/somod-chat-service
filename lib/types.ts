export type ThreadInput = {
  participants: string[];
};

export type Thread = {
  id: string;
} & ThreadInput;

export type MessageInput = {
  threadId: string;
  type: "text" | "image" | "control";
  action: "new" | "edit" | "delete";
  message: string;
};

export type Message = {
  id: string;
  from: string;
  seqNo: number;
  sentAt: number;
} & MessageInput;

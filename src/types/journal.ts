export interface TextBlock {
  id: string;
  type: "text";
  content: string;
  startedAt: string;
  endedAt: string;
}

export interface AudioBlock {
  id: string;
  type: "audio";
  name: string;
  audioBlob: Blob;
  startedAt: string;
  endedAt: string;
  duration: number;
}

export interface MediaBlock {
  id: string;
  type: "image" | "video" | "gif";
  name: string;
  mediaBlob: Blob;
  addedAt: string;
}

export type JournalBlock =
  | TextBlock
  | AudioBlock
  | MediaBlock;

export interface JournalEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  blocks: JournalBlock[];
}
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
  startedAt: string;
  endedAt: string;
}

export interface FileBlock {
  id: string;
  type: "file";
  name: string;
  fileBlob: Blob;
  mimeType: string;
  fileExtension: string;
  startedAt: string;
  endedAt: string;
}

export type JournalBlock =
  | TextBlock
  | AudioBlock
  | MediaBlock
  | FileBlock;

export interface JournalEntry {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  blocks: JournalBlock[];
}
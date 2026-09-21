import { useEffect, useState } from "react";
import type { AudioBlock, MediaBlock } from "../types/journal";

type Props = {
  block: AudioBlock | MediaBlock;
};

function MediaBlockView({ block }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    const blob = block.type === "audio" ? block.audioBlob : block.mediaBlob;

    const objectUrl = URL.createObjectURL(blob);

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [block]);

  if (!url) {
    return <p>Loading media...</p>;
  }

  // -------------------------
  // AUDIO
  // -------------------------

  if (block.type === "audio") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <p className="text-content">🎙 {block.name}</p>

        <audio controls src={url} />

        <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
      </article>
    );
  }

  // -------------------------
  // IMAGE / GIF
  // -------------------------

  if (block.type === "image" || block.type === "gif") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <p className="text-content">
          {block.type === "gif" ? "🖼" : "📷"} {block.name}
        </p>

        <img src={url} alt={block.name} className="media-preview" />

        <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
      </article>
    );
  }

  // -------------------------
  // VIDEO
  // -------------------------

  if (block.type === "video") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <p className="text-content">🎥 {block.name}</p>

        <video src={url} controls className="media-preview" />

        <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
      </article>
    );
  }

  return null;
}

// -------------------------
// DATE / TIME
// -------------------------

function formatDateTime(dateString: string) {
  const date = new Date(dateString);

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${month}${day}${year}.${hours}${minutes}`;
}

// // -------------------------
// // DURATION
// // -------------------------

// function formatDuration(seconds: number) {
//   const minutes = Math.floor(seconds / 60);
//   const remainingSeconds = seconds % 60;

//   return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
//     .toString()
//     .padStart(2, "0")}`;
// }

export default MediaBlockView;
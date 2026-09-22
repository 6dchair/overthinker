// import { useEffect, useState } from "react";
import type { AudioBlock, MediaBlock } from "../types/journal";
import { useEffect, useRef, useState } from "react";

type Props = {
  block: AudioBlock | MediaBlock;
  onRename: (blockId: string) => void;
  onDelete: (blockId: string) => void;
};

function MediaBlockView({ block, onRename, onDelete }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const blob = block.type === "audio" ? block.audioBlob : block.mediaBlob;
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [block]);

  // close menu whenever the block changes
  useEffect(() => {
    setMenuOpen(false);
  }, [block.id]);

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsideClick
      );
    };
  }, []);

  if (!url) {
    return <p>Loading media...</p>;
  }

  const renderDotsMenu = () => (
    <div
      className="menu-anchor"
      ref={menuRef}
    >
      <button
        className="dots-button"
        onClick={(event) => {
          event.stopPropagation();
          setMenuOpen((open) => !open);
        }}
        aria-label="Item options"
      >
        ⋮
      </button>

      {menuOpen ? (
        <div
          className="dropdown-menu"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            onClick={() => {
              setMenuOpen(false);
              onRename(block.id);
            }}
          >
           rɘname
          </button>

          <button
            className="delete-option"
            onClick={() => {
              setMenuOpen(false);
              onDelete(block.id);
            }}
          >
            dɘlɘtɘ
          </button>
        </div>
      ) : null}
    </div>
  );

  // -------------------------
  // AUDIO
  // dots sit at the rightmost end of the name row
  // -------------------------

  if (block.type === "audio") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <div className="media-block-header">
          <p className="text-content" style={{ margin: 0 }}>
            🎙 {block.name}
          </p>

          {renderDotsMenu()}
        </div>

        <audio controls src={url} />

        <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
      </article>
    );
  }

  // -------------------------
  // IMAGE / GIF
  // dots sit right after the last letter of the name
  // -------------------------

  if (block.type === "image" || block.type === "gif") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <div className="media-block-header">
          <p className="text-content" style={{ margin: 0 }}>
            {block.type === "gif" ? "🖼" : "📷"} {block.name}
          </p>

          {renderDotsMenu()}
        </div>

        <img src={url} alt={block.name} className="media-preview" />

        <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
      </article>
    );
  }

  // -------------------------
  // VIDEO
  // dots sit right after the last letter of the name
  // -------------------------

  if (block.type === "video") {
    return (
      <article className="journal-block">
        <p className="block-time">{formatDateTime(block.startedAt)}</p>

        <div className="media-block-header">
          <p className="text-content" style={{ margin: 0 }}>
            🎥 {block.name}
          </p>

          {renderDotsMenu()}
        </div>

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

export default MediaBlockView;
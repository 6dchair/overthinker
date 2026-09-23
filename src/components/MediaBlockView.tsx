import type { AudioBlock, MediaBlock, FileBlock } from "../types/journal";
import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";

type Props = {
  block: AudioBlock | MediaBlock | FileBlock;
  onRename: (blockId: string) => void;
  onDelete: (blockId: string) => void;
};

function MediaBlockView({ block, onRename, onDelete }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);

  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartYRef = useRef(0);
  const dragStartPanXRef = useRef(0);
  const dragStartPanYRef = useRef(0);

  const menuRef = useRef<HTMLDivElement | null>(null);

  // -------------------------
  // PINCH ZOOM + PAN
  // -------------------------

  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef(1);

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;

    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (event.touches.length === 2) {
      pinchStartDistanceRef.current = getTouchDistance(event.touches);
      pinchStartZoomRef.current = zoom;
      return;
    }

    if (event.touches.length === 1 && zoom > 1) {
      isDraggingRef.current = true;

      dragStartXRef.current = event.touches[0].clientX;
      dragStartYRef.current = event.touches[0].clientY;

      dragStartPanXRef.current = panX;
      dragStartPanYRef.current = panY;
    }
  };

  const handleTouchMove = (event: React.TouchEvent<HTMLDivElement>) => {
    // PINCH ZOOM
    if (event.touches.length === 2 && pinchStartDistanceRef.current !== null) {
      event.preventDefault();

      const currentDistance = getTouchDistance(event.touches);
      const scale = currentDistance / pinchStartDistanceRef.current;

      const newZoom = Math.min(
        Math.max(pinchStartZoomRef.current * scale, 1),
        4
      );

      setZoom(newZoom);
      return;
    }

    // PAN
    if (event.touches.length === 1 && isDraggingRef.current && zoom > 1) {
      event.preventDefault();

      const deltaX = event.touches[0].clientX - dragStartXRef.current;
      const deltaY = event.touches[0].clientY - dragStartYRef.current;

      setPanX(dragStartPanXRef.current + deltaX);
      setPanY(dragStartPanYRef.current + deltaY);
    }
  };

  const handleTouchEnd = () => {
    pinchStartDistanceRef.current = null;
    isDraggingRef.current = false;
  };

  // -------------------------
  // MOUSE PAN
  // -------------------------

  const handleMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (zoom <= 1) {
      return;
    }

    event.preventDefault();

    isDraggingRef.current = true;

    dragStartXRef.current = event.clientX;
    dragStartYRef.current = event.clientY;

    dragStartPanXRef.current = panX;
    dragStartPanYRef.current = panY;
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || zoom <= 1) {
      return;
    }

    setPanX(dragStartPanXRef.current + (event.clientX - dragStartXRef.current));
    setPanY(dragStartPanYRef.current + (event.clientY - dragStartYRef.current));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // -------------------------
  // CREATE MEDIA URL
  // -------------------------

  useEffect(() => {
    const blob =
      block.type === "audio"
        ? block.audioBlob
        : block.type === "file"
        ? block.fileBlob
        : block.mediaBlob;

    const objectUrl = URL.createObjectURL(blob);

    setUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [block]);

  // -------------------------
  // CLOSE MENU WHEN BLOCK CHANGES
  // -------------------------

  useEffect(() => {
    setMenuOpen(false);
  }, [block.id]);

  // -------------------------
  // CLOSE MENU OUTSIDE
  // -------------------------

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  // -------------------------
  // IMAGE VIEWER OPEN / CLOSE
  // Pushes its own history entry so a back-press or back-button
  // closes only the viewer first, not the underlying entry too.
  // -------------------------

  const resetImagePosition = () => {
    setPanX(0);
    setPanY(0);
  };

  const openImageViewer = () => {
    setZoom(1);
    resetImagePosition();

    window.history.pushState({ view: "image-viewer" }, "");

    setIsImageViewerOpen(true);
  };

  const closeImageViewer = () => {
    if (window.history.state?.view === "image-viewer") {
      window.history.back();
    }

    setIsImageViewerOpen(false);
    setZoom(1);
    resetImagePosition();
    pinchStartDistanceRef.current = null;
  };

  useEffect(() => {
    if (!isImageViewerOpen) {
      return;
    }

    // Hardware back button: consume via history rather than closing
    // directly, so App.tsx's own backButton listener sees canGoBack
    // and steps back through history instead of also closing the entry.
    const backListenerPromise = CapacitorApp.addListener("backButton", () => {
      if (window.history.state?.view === "image-viewer") {
        window.history.back();
      }
    });

    // The actual close happens here, in response to the pop this
    // component itself pushed — whether triggered by the back button
    // above, a browser back gesture, or closeImageViewer() directly.
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view !== "image-viewer") {
        setIsImageViewerOpen(false);
        setZoom(1);
        pinchStartDistanceRef.current = null;
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeImageViewer();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      backListenerPromise.then((handle) => handle.remove());
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isImageViewerOpen]);

  useEffect(() => {
    if (!isImageViewerOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isImageViewerOpen]);

  // -------------------------
  // DOTS MENU
  // -------------------------

  const renderDotsMenu = () => (
    <div className="menu-anchor" ref={menuRef}>
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
        <div className="dropdown-menu" onClick={(event) => event.stopPropagation()}>
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
  // IMAGE VIEWER RENDER
  // -------------------------

  const renderImageViewer = () => {
    if (!isImageViewerOpen || !url) {
      return null;
    }

    return (
      <div className="image-viewer-overlay" onClick={closeImageViewer}>
        <div
          className="image-viewer-content"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="image-viewer-toolbar">
            <button onClick={closeImageViewer} aria-label="Close image viewer">
              ×
            </button>
          </div>

          <div
            className="image-viewer-stage"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={(event) => {
              event.preventDefault();

              setZoom((current) => {
                const newZoom = Math.min(
                  Math.max(current + (event.deltaY < 0 ? 0.25 : -0.25), 1),
                  4
                );

                if (newZoom === 1) {
                  setPanX(0);
                  setPanY(0);
                }

                return newZoom;
              });
            }}
          >
            <img
              src={url}
              alt={block.name}
              className="image-viewer-image"
              style={{
                transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  // -------------------------
  // LOADING
  // -------------------------

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
  // -------------------------

  if (block.type === "image" || block.type === "gif") {
    return (
      <>
        <article className="journal-block">
          <p className="block-time">{formatDateTime(block.startedAt)}</p>

          <div className="media-block-header">
            <p className="text-content" style={{ margin: 0 }}>
              {block.type === "gif" ? "🖼" : "📷"} {block.name}
            </p>

            {renderDotsMenu()}
          </div>

          <img
            src={url}
            alt={block.name}
            className="media-preview clickable-media"
            onClick={openImageViewer}
          />

          <p className="block-end-time">{formatDateTime(block.endedAt)}</p>
        </article>

        {renderImageViewer()}
      </>
    );
  }

  // -------------------------
  // VIDEO
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

  // -------------------------
  // FILE
  // -------------------------

  if (block.type === "file") {
    const extension = (block.fileExtension || "")
      .replace(/^\./, "")
      .toLowerCase();

    const audioExtensions = [
      "mp3",
      "wav",
      "m4a",
      "ogg",
      "aac",
      "flac",
      "webm",
    ];

    const isAudioFile =
      audioExtensions.includes(extension) ||
      block.mimeType.startsWith("audio/");

    const icon =
      extension === "pdf"
        ? "📕"
        : extension === "txt"
        ? "📝"
        : isAudioFile
        ? "🎧"
        : "📄";

    // -------------------------
    // AUDIO FILE
    // -------------------------

    if (isAudioFile) {
      return (
        <article className="journal-block">
          <p className="block-time">
            {formatDateTime(block.startedAt)}
          </p>

          <div className="media-block-header">
            <p
              className="text-content"
              style={{ margin: 0 }}
            >
              {icon} {block.name}
            </p>

            {renderDotsMenu()}
          </div>

          <audio
            controls
            src={url}
          />

          <p className="block-end-time">
            {formatDateTime(block.endedAt)}
          </p>
        </article>
      );
    }

    // -------------------------
    // OTHER FILES
    // -------------------------

    return (
      <article className="journal-block">
        <p className="block-time">
          {formatDateTime(block.startedAt)}
        </p>

        <div className="media-block-header">
          <p
            className="text-content"
            style={{ margin: 0 }}
          >
            {icon} {block.name}
          </p>

          {renderDotsMenu()}
        </div>

        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="file-download-link"
        >
          open / download file ({extension.toUpperCase()})
        </a>

        <p className="block-end-time">
          {formatDateTime(block.endedAt)}
        </p>
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
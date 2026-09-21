import { useEffect, useRef, useState } from "react";
import type {
  JournalEntry,
  TextBlock,
  AudioBlock,
  MediaBlock,
} from "./types/journal";
import { getEntries, saveEntry, deleteEntry } from "./storage/db";
import MediaBlockView from "./components/MediaBlockView";

function App() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // -------------------------
  // LONG PRESS MENU
  // -------------------------

  const [contextEntryId, setContextEntryId] = useState<string | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  // -------------------------
  // ENTRY RENAMING
  // -------------------------

  const [isRenamingEntry, setIsRenamingEntry] = useState(false);
  const [entryName, setEntryName] = useState("");

  // -------------------------
  // TEXT WRITING
  // -------------------------

  const [writing, setWriting] = useState("");
  const [sessionStartedAt, setSessionStartedAt] = useState<string | null>(
    null
  );

  // -------------------------
  // AUDIO RECORDING
  // -------------------------

  const [isRecording, setIsRecording] = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(
    null
  );
  const [recordingDuration, setRecordingDuration] = useState(0);

  const [pendingAudio, setPendingAudio] = useState<{
    blob: Blob;
    startedAt: string;
    endedAt: string;
    duration: number;
  } | null>(null);

  const [audioName, setAudioName] = useState("Untitled recording");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // -------------------------
  // MEDIA ATTACHMENTS
  // -------------------------

  const [pendingMedia, setPendingMedia] = useState<{
    blob: Blob;
    type: "image" | "video" | "gif";
    fileName: string;
  } | null>(null);

  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState("Untitled media");

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  // -------------------------
  // LOAD DATABASE
  // -------------------------

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const storedEntries = await getEntries();
        setEntries(storedEntries);
      } catch (error) {
        console.error("Could not load journal entries:", error);
        alert("Could not load your journal entries.");
      } finally {
        setLoading(false);
      }
    };

    loadEntries();
  }, []);

  // -------------------------
  // MEDIA PREVIEW CLEANUP
  // -------------------------

  useEffect(() => {
    return () => {
      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }
    };
  }, [mediaPreviewUrl]);

  // -------------------------
  // DATE / TIME
  // -------------------------

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);

    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${month}${day}${year}.${hours}${minutes}`;
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  };

  // -------------------------
  // ENTRY FUNCTIONS
  // -------------------------

  const createEntry = async () => {
    const now = new Date().toISOString();

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      title: "Untitled Entry",
      createdAt: now,
      updatedAt: now,
      blocks: [],
    };

    try {
      await saveEntry(newEntry);

      setEntries((current) => [newEntry, ...current]);
      setSelectedEntryId(newEntry.id);
    } catch (error) {
      console.error("Could not create entry:", error);
      alert("Could not save the new entry.");
    }
  };

  const openEntry = (entryId: string) => {
    setSelectedEntryId(entryId);
  };

  const closeEntry = () => {
    setSelectedEntryId(null);
    setWriting("");
    setSessionStartedAt(null);
    setIsRenamingEntry(false);
    setEntryName("");
    setContextEntryId(null);
  };

  // -------------------------
  // LONG PRESS / CONTEXT MENU
  // -------------------------

  const startEntryLongPress = (entryId: string) => {
    longPressTimerRef.current = window.setTimeout(() => {
      setContextEntryId(entryId);
    }, 600);
  };

  const cancelEntryLongPress = () => {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const openEntryMenu = (entryId: string) => {
    setContextEntryId(entryId);
  };

  const closeEntryMenu = () => {
    setContextEntryId(null);
  };

  // -------------------------
  // RENAME FROM MENU
  // -------------------------

  const renameEntryFromMenu = (entryId: string) => {
    const entry = entries.find(
      (currentEntry) => currentEntry.id === entryId
    );

    if (!entry) {
      return;
    }

    setSelectedEntryId(entryId);
    setEntryName(entry.title);
    setIsRenamingEntry(true);
    setContextEntryId(null);
  };

  const cancelRenamingEntry = () => {
    setIsRenamingEntry(false);
    setEntryName("");
  };

  const saveEntryName = async () => {
    if (!selectedEntry) {
      return;
    }

    const newName = entryName.trim();

    if (!newName) {
      alert("Please enter a name for the entry.");
      return;
    }

    const updatedAt = new Date().toISOString();

    const updatedEntry: JournalEntry = {
      ...selectedEntry,
      title: newName,
      updatedAt,
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntry.id ? updatedEntry : entry
        )
      );

      setIsRenamingEntry(false);
      setEntryName("");
    } catch (error) {
      console.error("Could not rename entry:", error);
      alert("Could not rename the entry.");
    }
  };

  // -------------------------
  // DELETE FROM MENU
  // -------------------------

  const deleteEntryFromMenu = async (entryId: string) => {
    const entry = entries.find(
      (currentEntry) => currentEntry.id === entryId
    );

    if (!entry) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${entry.title}"?\n\nThis will permanently delete the entry and all of its writing, recordings, images, GIFs, and videos from this device.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteEntry(entryId);

      setEntries((current) =>
        current.filter((currentEntry) => currentEntry.id !== entryId)
      );

      setContextEntryId(null);

      if (selectedEntryId === entryId) {
        setSelectedEntryId(null);
      }
    } catch (error) {
      console.error("Could not delete entry:", error);
      alert("Could not delete the entry.");
    }
  };

  // -------------------------
  // TEXT WRITING
  // -------------------------

  const startWriting = () => {
    setWriting("");
    setSessionStartedAt(new Date().toISOString());
  };

  const finishWriting = async () => {
    if (!selectedEntryId || !sessionStartedAt || !writing.trim()) {
      return;
    }

    const endedAt = new Date().toISOString();

    const newBlock: TextBlock = {
      id: crypto.randomUUID(),
      type: "text",
      content: writing.trim(),
      startedAt: sessionStartedAt,
      endedAt,
    };

    const currentEntry = entries.find(
      (entry) => entry.id === selectedEntryId
    );

    if (!currentEntry) {
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: endedAt,
      blocks: [...currentEntry.blocks, newBlock],
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntryId ? updatedEntry : entry
        )
      );

      setWriting("");
      setSessionStartedAt(null);
    } catch (error) {
      console.error("Could not save writing:", error);
      alert("Could not save your writing.");
    }
  };

  // -------------------------
  // AUDIO RECORDING
  // -------------------------

  const startRecording = async () => {
    if (!selectedEntryId) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      let mimeType = "";

      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")) {
        mimeType = "audio/ogg;codecs=opus";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      const startedAt = new Date().toISOString();

      setRecordingStartedAt(startedAt);
      setRecordingDuration(0);
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const endedAt = new Date().toISOString();

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        });

        setPendingAudio({
          blob: audioBlob,
          startedAt,
          endedAt,
          duration: recordingDuration,
        });

        setAudioName("Untitled recording");

        stream.getTracks().forEach((track) => track.stop());

        setRecordingStartedAt(null);
        setRecordingDuration(0);
        setIsRecording(false);
      };

      recorder.onerror = (event) => {
        console.error("MediaRecorder error:", event);
      };

      recorder.start();

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration((current) => current + 1);
      }, 1000);
    } catch (error) {
      console.error("Could not access microphone:", error);

      alert("Microphone access is required to record audio.");
    }
  };

  const stopRecording = () => {
    if (recordingTimerRef.current !== null) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const savePendingAudio = async () => {
    if (!selectedEntryId || !pendingAudio) {
      return;
    }

    const newBlock: AudioBlock = {
      id: crypto.randomUUID(),
      type: "audio",
      name: audioName.trim() || "Untitled recording",
      audioBlob: pendingAudio.blob,
      startedAt: pendingAudio.startedAt,
      endedAt: pendingAudio.endedAt,
      duration: pendingAudio.duration,
    };

    const currentEntry = entries.find(
      (entry) => entry.id === selectedEntryId
    );

    if (!currentEntry) {
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: pendingAudio.endedAt,
      blocks: [...currentEntry.blocks, newBlock],
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntryId ? updatedEntry : entry
        )
      );

      setPendingAudio(null);
      setAudioName("Untitled recording");
    } catch (error) {
      console.error("Could not save recording:", error);
      alert("Could not save the recording.");
    }
  };

  const discardPendingAudio = () => {
    setPendingAudio(null);
    setAudioName("Untitled recording");
  };

  // -------------------------
  // MEDIA
  // -------------------------

  const openMediaPicker = () => {
    mediaInputRef.current?.click();
  };

  const handleMediaSelected = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    let type: "image" | "video" | "gif";

    if (file.type === "image/gif") {
      type = "gif";
    } else if (file.type.startsWith("image/")) {
      type = "image";
    } else if (file.type.startsWith("video/")) {
      type = "video";
    } else {
      alert("Please select an image, GIF, or video.");
      return;
    }

    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    const previewUrl = URL.createObjectURL(file);

    setMediaPreviewUrl(previewUrl);

    setPendingMedia({
      blob: file,
      type,
      fileName: file.name,
    });

    setMediaName(
      file.name.replace(/\.[^/.]+$/, "") || "Untitled media"
    );

    event.target.value = "";
  };

  const savePendingMedia = async () => {
    if (!selectedEntryId || !pendingMedia) {
      return;
    }

    const startedAt = new Date().toISOString();

    const newBlock: MediaBlock = {
      id: crypto.randomUUID(),
      type: pendingMedia.type,
      name: mediaName.trim() || "Untitled media",
      mediaBlob: pendingMedia.blob,
      startedAt,
      endedAt: startedAt,
    };

    const currentEntry = entries.find(
      (entry) => entry.id === selectedEntryId
    );

    if (!currentEntry) {
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: startedAt,
      blocks: [...currentEntry.blocks, newBlock],
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntryId ? updatedEntry : entry
        )
      );

      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }

      setPendingMedia(null);
      setMediaPreviewUrl(null);
      setMediaName("Untitled media");
    } catch (error) {
      console.error("Could not save media:", error);
      alert("Could not save the media.");
    }
  };

  const discardPendingMedia = () => {
    if (mediaPreviewUrl) {
      URL.revokeObjectURL(mediaPreviewUrl);
    }

    setPendingMedia(null);
    setMediaPreviewUrl(null);
    setMediaName("Untitled media");
  };

  // -------------------------
  // SELECTED ENTRY
  // -------------------------

  const selectedEntry = entries.find(
    (entry) => entry.id === selectedEntryId
  );

  // -------------------------
  // LOADING
  // -------------------------

  if (loading) {
    return (
      <main className="app">
        <div className="app-content">
          <h1>overthinker</h1>
          <p>Loading your journal...</p>
        </div>
      </main>
    );
  }

  // -------------------------
  // ENTRY VIEW
  // -------------------------

  if (selectedEntry) {
    return (
      <main className="app">
        <div className="app-content entry-view">

          {/* BACK */}

          <button className="back-button" onClick={closeEntry}>
            ← Back
          </button>

          {/* ENTRY HEADER */}

          <header className="entry-header">

            {isRenamingEntry ? (
              <section className="rename-section">
                <input
                  type="text"
                  value={entryName}
                  onChange={(event) =>
                    setEntryName(event.target.value)
                  }
                  autoFocus
                />

                <div className="button-row">
                  <button onClick={saveEntryName}>
                    ✓ Save
                  </button>

                  <button onClick={cancelRenamingEntry}>
                    Cancel
                  </button>
                </div>
              </section>
            ) : (
              <>
                <h1>{selectedEntry.title}</h1>

                <p className="entry-created">
                  Created: {formatDateTime(selectedEntry.createdAt)}
                </p>
              </>
            )}

            {/* ACTIONS DIRECTLY UNDER CREATED */}

            {!isRenamingEntry ? (
              <div className="entry-actions-top">

                <button
                  onClick={startWriting}
                  aria-label="Continue writing"
                  title="Continue writing"
                >
                  ✏️
                </button>

                <button onClick={startRecording}>
                  🎙
                </button>

                <button onClick={openMediaPicker}>
                  📎
                </button>

              </div>
            ) : null}

          <hr className="entry-separator" />

          </header>

          {/* EXISTING BLOCKS */}

          <section className="entry-blocks">
            {selectedEntry.blocks.map((block) => {

              if (block.type === "text") {
                return (
                  <article
                    className="journal-block"
                    key={block.id}
                  >
                    <p className="block-time">
                      {formatDateTime(block.startedAt)}
                    </p>

                    <p className="text-content">
                      {block.content}
                    </p>

                    <p className="block-end-time">
                      {formatDateTime(block.endedAt)}
                    </p>
                  </article>
                );
              }

              if (
                block.type === "audio" ||
                block.type === "image" ||
                block.type === "gif" ||
                block.type === "video"
              ) {
                return (
                  <MediaBlockView
                    key={block.id}
                    block={block}
                  />
                );
              }

              return null;
            })}
          </section>

          {/* WRITING */}

          {sessionStartedAt && !isRecording ? (
            <section className="composer-section">

              <p className="session-time">
                Writing started:{" "}
                {formatDateTime(sessionStartedAt)}
              </p>

              <textarea
                value={writing}
                onChange={(event) =>
                  setWriting(event.target.value)
                }
                placeholder="write whatever's on ur mind..."
                rows={10}
                autoFocus
              />

              <button onClick={finishWriting}>
                ✓ done
              </button>

            </section>
          ) : null}

          {/* RECORDING */}

          {isRecording ? (
            <section className="composer-section">

              <h2>r e c o r d 🎙 n g</h2>

              <p className="recording-time">
                {formatDuration(recordingDuration)}
              </p>

              <p>
                Started:{" "}
                {recordingStartedAt
                  ? formatDateTime(recordingStartedAt)
                  : ""}
              </p>

              <button onClick={stopRecording}>
                s t ■ p
              </button>

            </section>
          ) : null}

          {/* PENDING AUDIO */}

          {pendingAudio ? (
            <section className="composer-section">

              <h2>Recording finished</h2>

              <audio
                controls
                src={URL.createObjectURL(
                  pendingAudio.blob
                )}
              />

              <p>
                Duration:{" "}
                {formatDuration(
                  pendingAudio.duration
                )}
              </p>

              <label>
                Name

                <input
                  type="text"
                  value={audioName}
                  onChange={(event) =>
                    setAudioName(event.target.value)
                  }
                />
              </label>

              <div className="button-row">

                <button onClick={discardPendingAudio}>
                  Delete
                </button>

                <button onClick={savePendingAudio}>
                  Save recording
                </button>

              </div>

            </section>
          ) : null}

          {/* PENDING MEDIA */}

          {pendingMedia && mediaPreviewUrl ? (
            <section className="composer-section">

              <h2>
                {pendingMedia.type === "image" && "📷 Image"}
                {pendingMedia.type === "gif" && "🖼 GIF"}
                {pendingMedia.type === "video" && "🎥 Video"}
              </h2>

              {pendingMedia.type === "image" ||
              pendingMedia.type === "gif" ? (
                <img
                  src={mediaPreviewUrl}
                  alt={mediaName}
                  className="media-preview"
                />
              ) : (
                <video
                  src={mediaPreviewUrl}
                  controls
                  className="media-preview"
                />
              )}

              <label>
                Name

                <input
                  type="text"
                  value={mediaName}
                  onChange={(event) =>
                    setMediaName(event.target.value)
                  }
                />
              </label>

              <div className="button-row">

                <button onClick={discardPendingMedia}>
                  Delete
                </button>

                <button onClick={savePendingMedia}>
                  Save media
                </button>

              </div>

            </section>
          ) : null}

          {/* FILE INPUT */}

          <input
            ref={mediaInputRef}
            type="file"
            accept="image/*,video/*"
            onChange={handleMediaSelected}
            style={{ display: "none" }}
          />

        </div>
      </main>
    );
  }

  // -------------------------
  // HOME
  // -------------------------

  return (
    <main className="app">

      <div className="app-content">

        {/* HEADER */}

        <header className="home-header">

          <div className="home-brand">

            <div className="logo-row">

              <h1 className="logo">
                overthinker
              </h1>

              {/* <button
                className="write-button"
                onClick={createEntry}
                aria-label="Create new entry"
                title="New entry"
              >
                ＋
              </button> */}

            </div>

            <p className="tagline">
              a place for everything on ur mind
            </p>

          </div>

        </header>

        {/* ENTRIES */}

        {/* <section>

          <h2 className="section-label">
            YOUR ENTRIES
          </h2> */}
        <section>
          <div className="eye-button-wrapper">
            <span className="eyelashes" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </span>

            <button
              className="write-button"
              onClick={createEntry}
              aria-label="Create new entry"
              title="New entry"
            >
              <span className="eye-pupil">＋</span>
            </button>
          </div>



          {entries.length === 0 ? (

            <div className="empty-state">

              <p>No entries yet.</p>

              <p>
                Start writing whenever you're ready.
              </p>

            </div>

          ) : (

            <div className="entry-list">

              {entries.map((entry, index) => (

                <article
                  key={entry.id}
                  className="entry-item"

                  onClick={() => {
                    if (contextEntryId) {
                      closeEntryMenu();
                      return;
                    }

                    openEntry(entry.id);
                  }}

                  onPointerDown={() =>
                    startEntryLongPress(entry.id)
                  }

                  onPointerUp={cancelEntryLongPress}
                  onPointerLeave={cancelEntryLongPress}

                  onContextMenu={(event) => {
                    event.preventDefault();
                    openEntryMenu(entry.id);
                  }}
                >

                  {/* NUMBER */}

                  <div className="entry-number">
                    {(index + 1)
                      .toString()
                      .padStart(2, "0")}
                  </div>

                  {/* ENTRY INFORMATION */}

                  <div className="entry-info">

                    <h3 className="entry-title">
                      {entry.title}
                    </h3>

                    <p className="entry-meta">
                      {formatDateTime(entry.createdAt)}
                    </p>

                    <p className="entry-count">
                      {entry.blocks.length}{" "}
                      {entry.blocks.length === 1
                        ? "addition"
                        : "additions"}
                    </p>

                  </div>

                  {/* LONG PRESS MENU */}

                  {contextEntryId === entry.id ? (

                    <div
                      className="entry-context-menu"

                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >

                      <button
                        onClick={() =>
                          renameEntryFromMenu(entry.id)
                        }
                      >
                        ✏️ Rename
                      </button>

                      <button
                        className="delete-option"
                        onClick={() =>
                          deleteEntryFromMenu(entry.id)
                        }
                      >
                        🗑 Delete
                      </button>

                      <button
                        onClick={closeEntryMenu}
                      >
                        Cancel
                      </button>

                    </div>

                  ) : null}

                </article>

              ))}

            </div>

          )}

        </section>

      </div>

    </main>
  );
}

export default App;
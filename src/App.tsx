// import { useState } from "react";
import SplashScreen from "./components/SplashScreen";


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
  /////
  const writingSectionRef = useRef<HTMLDivElement | null>(null);
  const recordingSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingAudioSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingMediaSectionRef = useRef<HTMLDivElement | null>(null);
  // For the entry page issue when adding media or recording, the display is on them

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  const [showSplash, setShowSplash] = useState(true);

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

  const [audioName, setAudioName] = useState("no titlɘ ¿");

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
  const [mediaName, setMediaName] = useState("untitled media");

  const mediaInputRef = useRef<HTMLInputElement | null>(null);

  const [entryTitleMenuOpen, setEntryTitleMenuOpen] = useState(false);
  const entryTitleMenuRef = useRef<HTMLDivElement | null>(null);


  // -------------------------
  // SCROLL TO ACTIVE COMPOSER SECTION
  // -------------------------

  useEffect(() => {
    if (sessionStartedAt && !isRecording) {
      writingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [sessionStartedAt, isRecording]);

  useEffect(() => {
    if (isRecording) {
      recordingSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [isRecording]);

  useEffect(() => {
    if (pendingAudio) {
      pendingAudioSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [pendingAudio]);

  useEffect(() => {
    if (pendingMedia && mediaPreviewUrl) {
      pendingMediaSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [pendingMedia, mediaPreviewUrl]);


  // -------------------------
  // CLOSE MENUS WHEN CLICKING OUTSIDE
  // -------------------------

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;

      if (
        target.closest(".entry-context-menu") ||
        target.closest(".dots-button")
      ) {
        return;
      }

      setContextEntryId(null);
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: PointerEvent) => {
      if (
        entryTitleMenuRef.current &&
        !entryTitleMenuRef.current.contains(event.target as Node)
      ) {
        setEntryTitleMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, []);

  // -------------------------
// PHONE / BROWSER BACK BUTTON
// -------------------------

// useEffect(() => {
//   const handlePopState = () => {
//     setSelectedEntryId(null);
//     setWriting("");
//     setSessionStartedAt(null);
//     setIsRenamingEntry(false);
//     setEntryName("");
//     setContextEntryId(null);
//   };

//   window.addEventListener("popstate", handlePopState);

//   return () => {
//     window.removeEventListener("popstate", handlePopState);
//   };
// }, []);
  // -------------------------
  // PHONE / BROWSER BACK BUTTON
  // -------------------------

  useEffect(() => {
    // Ensure there's always a base "home" history entry underneath
    // any entry we push, so the phone's back button/gesture has
    // something to land on instead of exiting the app.
    if (!window.history.state || window.history.state.view !== "home") {
      window.history.replaceState({ view: "home" }, "");
    }
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!event.state || event.state.view !== "entry") {
        setSelectedEntryId(null);
        setWriting("");
        setSessionStartedAt(null);
        setIsRenamingEntry(false);
        setEntryName("");
        setContextEntryId(null);
        setEntryTitleMenuOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);
  // -------------------------
  // LOAD DATABASE
  // -------------------------

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const storedEntries = await getEntries();
        setEntries(storedEntries);
      } catch (error) {
        console.error("could not load journal entries:", error);
        alert("could not load your journal entries.");
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
      title: "untitled entry",
      createdAt: now,
      updatedAt: now,
      blocks: [],
    };

    try {
      await saveEntry(newEntry);

      setEntries((current) => [newEntry, ...current]);
      setSelectedEntryId(newEntry.id);
    } catch (error) {
      console.error("could not create entry:", error);
      alert("could not save the new entry.");
    }
  };

  // const openEntry = (entryId: string) => {
  //   setSelectedEntryId(entryId);
  // };

  // const closeEntry = () => {
  //   setSelectedEntryId(null);
  //   setWriting("");
  //   setSessionStartedAt(null);
  //   setIsRenamingEntry(false);
  //   setEntryName("");
  //   setContextEntryId(null);
  //   setEntryTitleMenuOpen(false);
  // };

  const openEntry = (entryId: string) => {
    window.history.pushState({ entryId }, "");
    setSelectedEntryId(entryId);
  };

  const closeEntry = () => {
    if (window.history.state?.entryId) {
      window.history.back();
    }

    setSelectedEntryId(null);
    setWriting("");
    setSessionStartedAt(null);
    setIsRenamingEntry(false);
    setEntryName("");
    setContextEntryId(null);
    setEntryTitleMenuOpen(false);
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
      console.error("could not rename entry:", error);
      alert("could not rename the entry.");
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
      `dɘlɘtɘ"${entry.title}"?\n\nthis will permanently delete the entry & all of its writing, recordings, images, GIFs, & videos from this device`
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
      console.error("could not delete entry:", error);
      alert("could not delete the entry.");
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

        setAudioName("untitled recording");

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

    const addedAt = new Date().toISOString();

    const newBlock: MediaBlock = {
      id: crypto.randomUUID(),
      type: pendingMedia.type,
      name: mediaName.trim() || "Untitled media",
      mediaBlob: pendingMedia.blob,
      startedAt: addedAt,
      endedAt: addedAt,
    };

    const currentEntry = entries.find(
      (entry) => entry.id === selectedEntryId
    );

    if (!currentEntry) {
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: addedAt,
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
  // BLOCK RENAME / DELETE
  // -------------------------

  const renameBlockInEntry = async (blockId: string) => {
    if (!selectedEntry) {
      return;
    }

    const block = selectedEntry.blocks.find((b) => b.id === blockId);

    if (!block || block.type === "text") {
      return;
    }

    const newName = window.prompt("rename to:", block.name);

    if (newName === null) {
      return;
    }

    const trimmed = newName.trim();

    if (!trimmed) {
      alert("Please enter a name.");
      return;
    }

    const updatedAt = new Date().toISOString();

    const updatedEntry: JournalEntry = {
      ...selectedEntry,
      updatedAt,
      blocks: selectedEntry.blocks.map((b) =>
        b.id === blockId ? { ...b, name: trimmed } : b
      ),
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntry.id ? updatedEntry : entry
        )
      );
    } catch (error) {
      console.error("could not rename item:", error);
      alert("could not rename this item.");
    }
  };

  const deleteBlockFromEntry = async (blockId: string) => {
    if (!selectedEntry) {
      return;
    }

    const confirmed = window.confirm(
      "delete this item? this cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    const updatedAt = new Date().toISOString();

    const updatedEntry: JournalEntry = {
      ...selectedEntry,
      updatedAt,
      blocks: selectedEntry.blocks.filter((b) => b.id !== blockId),
    };

    try {
      await saveEntry(updatedEntry);

      setEntries((current) =>
        current.map((entry) =>
          entry.id === selectedEntry.id ? updatedEntry : entry
        )
      );
    } catch (error) {
      console.error("could not delete item:", error);
      alert("could not delete this item.");
    }
  };



  if (showSplash) {
    return (
      <SplashScreen
        onFinished={() => setShowSplash(false)}
      />
    );
  }


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

          <div className="entry-sticky-header">

          {/* BACK */}

          <button className="back-button" onClick={closeEntry} aria-label="Back">
            ˂
          </button>

          {/* ENTRY HEADER */}

          

  <header className="entry-header">

    {isRenamingEntry ? (
      <section className="rename-section">
  <input
    type="text"
    value={entryName}
    onChange={(event) => setEntryName(event.target.value)}
    autoFocus
    aria-label="Entry name"
  />

  <div className="button-row">
    <button onClick={saveEntryName}>
      savɘ
    </button>

    <button onClick={cancelRenamingEntry}>
      cancel
    </button>
  </div>
</section>
    ) : (
      <>
        <div className="entry-title-row">
          <h1>{selectedEntry.title}</h1>

          <div
            className="menu-anchor"
            ref={entryTitleMenuRef}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button
              className="dots-button"
              onClick={() => setEntryTitleMenuOpen((open) => !open)}
              aria-label="Entry options"
            >
              ⋮
            </button>

            {entryTitleMenuOpen ? (
              <div className="dropdown-menu">
                <button
                  onClick={() => {
                    setEntryTitleMenuOpen(false);
                    renameEntryFromMenu(selectedEntry.id);
                  }}
                >
                  rɘnamɘ
                </button>

                <button
                  className="delete-option"
                  onClick={() => {
                    setEntryTitleMenuOpen(false);
                    deleteEntryFromMenu(selectedEntry.id);
                  }}
                >
                  dɘlɘtɘ
                </button>

                <button onClick={() => setEntryTitleMenuOpen(false)}>
                  cancel
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <p className="entry-created">
          created: {formatDateTime(selectedEntry.createdAt)}
        </p>
      </>
    )}

    {!isRenamingEntry ? (
      <div className="entry-actions-top">

        <button
          onClick={startWriting}
          aria-label="Continue writing"
          title="Continue writing"
        >
          🖉
        </button>

        <button
          onClick={startRecording}
          aria-label="Record"
          title="Record"
        >
          🎙
        </button>

        <button
          onClick={openMediaPicker}
          aria-label="Add media"
          title="Add media"
        >
          📎
        </button>

      </div>
    ) : null}

  </header>

  <hr className="entry-separator" />

</div>

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
                    onRename={renameBlockInEntry}
                    onDelete={deleteBlockFromEntry}
                  />
                );
              }

              return null;
            })}
          </section>

          {/* WRITING */}

          {sessionStartedAt && !isRecording ? (
            <section className="composer-section" ref={writingSectionRef}>

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
            <section className="composer-section" ref={recordingSectionRef}>

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
            <section className="composer-section" ref={pendingAudioSectionRef}>

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
                  dɘlɘtɘ
                </button>

                <button onClick={savePendingAudio}>
                  savɘ
                </button>

              </div>

            </section>
          ) : null}

          {/* PENDING MEDIA */}

          {pendingMedia && mediaPreviewUrl ? (
            <section className="composer-section" ref={pendingMediaSectionRef}>

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
                  dɘlɘtɘ
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

          <div className="home-sticky-header">

            {/* HEADER */}

            <header className="home-header">

              <div className="home-brand">

                <div className="logo-row">
                  <h1 className="logo">
                    ovɘrthinkɘr
                  </h1>
                </div>

                <p className="tagline">
                  a place for everything on ur mind
                </p>

              </div>

            </header>

            {/* EYE / NEW ENTRY BUTTON */}

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

            <hr className="entry-separator" />

          </div>

          {/* ENTRIES */}

          <section>

            {entries.length === 0 ? (

              <div className="empty-state">
                <p>woa, emptyy y ...  anyway, start writing whenever u're ready :)</p>
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

                    {/* <h3 className="entry-title">
                      {entry.title}
                    </h3> */}
                    <div className="entry-title-row">
                      <h3 className="entry-title">
                        {entry.title}
                      </h3>

                      {/* <button
                        className="dots-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEntryMenu(entry.id);
                        }}
                        aria-label="Entry options"
                      >
                        ⋮
                      </button> */}
                    </div>

                    <div className="entry-meta-row">
                      <span className="entry-meta">
                        {formatDateTime(entry.createdAt)}
                      </span>

                      <span className="entry-divider"> ٭ </span>

                      <span className="entry-count">
          
                        {entry.blocks.length}{" "}
                        {entry.blocks.length === 1
                          ? "addition"
                          : "additions"}
                      </span>

            
                    </div>

                  </div>

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
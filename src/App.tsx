// import { useState } from "react";
import SplashScreen from "./components/SplashScreen";


import { useEffect, useRef, useState } from "react";

import { App as CapacitorApp } from "@capacitor/app";


import type {
  JournalEntry,
  TextBlock,
  AudioBlock,
  MediaBlock,
  FileBlock,
} from "./types/journal";
import { getEntries, saveEntry, deleteEntry } from "./storage/db";
import MediaBlockView from "./components/MediaBlockView";

function App() {
  /////
  const writingSectionRef = useRef<HTMLDivElement | null>(null);
  const recordingSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingAudioSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingMediaSectionRef = useRef<HTMLDivElement | null>(null);
  const pendingFileSectionRef = useRef<HTMLElement | null>(null);
  // For the entry page issue when adding media or recording, the display is on them

  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);


  const [showSplash, setShowSplash] = useState(true);


  /// more file formats : attach file
  const [pendingFile, setPendingFile] = useState<{
    blob: Blob;
    fileName: string;
    mimeType: string;
    fileExtension: string;
  } | null>(null);

  const [fileName, setFileName] = useState("Untitled file");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  //////   select to bulk delete
  const [selectMode, setSelectMode] = useState(false);
  const [selectedEntryIds, setSelectedEntryIds] = useState<string[]>([]);


  const toggleSelectMode = () => {
    setSelectMode((current) => !current);
    setSelectedEntryIds([]);
  };

  const toggleEntrySelection = (entryId: string) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((id) => id !== entryId)
        : [...current, entryId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedEntryIds.length === entries.length) {
      setSelectedEntryIds([]);
    } else {
      setSelectedEntryIds(entries.map((entry) => entry.id));
    }
  };

  const deleteSelectedEntries = async () => {
    if (selectedEntryIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `delete ${selectedEntryIds.length} ${
        selectedEntryIds.length === 1 ? "entry" : "entries"
      }?\n\nthis will permanently delete the selected entries & all of their writing, recordings, images, GIFs, & videos from this device`
    );

    if (!confirmed) {
      return;
    }

    try {
      await Promise.all(
        selectedEntryIds.map((entryId) => deleteEntry(entryId))
      );

      setEntries((current) =>
        current.filter((entry) => !selectedEntryIds.includes(entry.id))
      );

      setSelectedEntryIds([]);
      setSelectMode(false);
    } catch (error) {
      console.error("could not delete selected entries:", error);
      alert("could not delete the selected entries.");
    }
  };
  /////////////////////



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





  // so eyeplus button wont always add new entry unless saved
  const [draftEntry, setDraftEntry] = useState<JournalEntry | null>(null);
  const [showBlankEntryPrompt, setShowBlankEntryPrompt] = useState(false);

  const selectedEntryIdRef = useRef<string | null>(null);
  const draftEntryRef = useRef<JournalEntry | null>(null);

  useEffect(() => {
    selectedEntryIdRef.current = selectedEntryId;
  }, [selectedEntryId]);

  useEffect(() => {
    draftEntryRef.current = draftEntry;
  }, [draftEntry]);


  const findEntryById = (entryId: string): JournalEntry | undefined => {
    if (draftEntry && draftEntry.id === entryId) {
      return draftEntry;
    }
    return entries.find((entry) => entry.id === entryId);
  };

  const getCurrentEntryForEdit = (): JournalEntry | undefined => {
    if (!selectedEntryId) {
      return undefined;
    }
    return findEntryById(selectedEntryId);
  };

  const persistEntryUpdate = async (updatedEntry: JournalEntry) => {
    await saveEntry(updatedEntry);

    const wasDraft = draftEntry?.id === updatedEntry.id;

    setEntries((current) =>
      wasDraft
        ? [updatedEntry, ...current]
        : current.map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry
          )
    );

    if (wasDraft) {
      setDraftEntry(null);
    }
  };

  const createEntry = () => {
    const now = new Date().toISOString();

    const newEntry: JournalEntry = {
      id: crypto.randomUUID(),
      title: "untitled entry",
      createdAt: now,
      updatedAt: now,
      blocks: [],
    };

    setDraftEntry(newEntry);
    openEntry(newEntry.id);
  };
  /////



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

  useEffect(() => {
    if (pendingFile) {
      pendingFileSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [pendingFile]);


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


  useEffect(() => {
    if (!sessionStartedAt || isRecording) {
      return;
    }

    const handleOutsideClick = (event: PointerEvent) => {
      const target = event.target as HTMLElement;

      if (
        writingSectionRef.current &&
        writingSectionRef.current.contains(target)
      ) {
        return;
      }

      if (target.closest('[aria-label="Continue writing"]')) {
        return;
      }

      cancelWriting();
    };

    document.addEventListener("pointerdown", handleOutsideClick);

    return () => {
      document.removeEventListener("pointerdown", handleOutsideClick);
    };
  }, [sessionStartedAt, isRecording]);

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

  // useEffect(() => {
  //   const listener = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
  //     if (canGoBack) {
  //       window.history.back();
  //     } else {
  //       CapacitorApp.exitApp();
  //     }
  //   });

  //   return () => {
  //     listener.then((handle) => handle.remove());
  //   };
  // }, []);
  useEffect(() => {
    const listenerPromise = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (selectedEntryIdRef.current) {
        const draft = draftEntryRef.current;
        const isBlankDraft =
          !!draft &&
          draft.id === selectedEntryIdRef.current &&
          draft.blocks.length === 0;

        if (isBlankDraft) {
          setShowBlankEntryPrompt(true);
        } else {
          closeEntry();
        }
      } else if (canGoBack) {
        window.history.back();
      } else {
        CapacitorApp.exitApp();
      }
    });

    return () => {
      listenerPromise.then((handle) => handle.remove());
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

  // const createEntry = async () => {
  //   const now = new Date().toISOString();

  //   const newEntry: JournalEntry = {
  //     id: crypto.randomUUID(),
  //     title: "untitled entry",
  //     createdAt: now,
  //     updatedAt: now,
  //     blocks: [],
  //   };

  //   try {
  //     await saveEntry(newEntry);

  //     setEntries((current) => [newEntry, ...current]);
  //     setSelectedEntryId(newEntry.id);
  //   } catch (error) {
  //     console.error("could not create entry:", error);
  //     alert("could not save the new entry.");
  //   }
  // };

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

  // const openEntry = (entryId: string) => {
  //   window.history.pushState({ entryId }, "");
  //   setSelectedEntryId(entryId);
  // };

  const openEntry = (entryId: string) => {
    window.history.pushState(
      { view: "entry", entryId },
      ""
    );

    setSelectedEntryId(entryId);
  };

  const closeEntry = () => {
    if (window.history.state?.view === "entry") {
      window.history.back();
    }

    setSelectedEntryId(null);
    setWriting("");
    setSessionStartedAt(null);
    setIsRenamingEntry(false);
    setEntryName("");
    setContextEntryId(null);
    setEntryTitleMenuOpen(false);
    setDraftEntry(null);
  };

  const attemptCloseEntry = () => {
    const isBlankDraft =
      !!draftEntry &&
      draftEntry.id === selectedEntryId &&
      draftEntry.blocks.length === 0;

    if (isBlankDraft) {
      setShowBlankEntryPrompt(true);
      return;
    }

    closeEntry();
  };

  const saveBlankEntryAndClose = async () => {
    if (draftEntry) {
      try {
        await persistEntryUpdate(draftEntry);
      } catch (error) {
        console.error("could not save entry:", error);
        alert("could not save the entry.");
        return;
      }
    }
    setDraftEntry(null);
    setShowBlankEntryPrompt(false);
    closeEntry();
  };

  const discardBlankEntryAndClose = () => {
    setDraftEntry(null);
    setShowBlankEntryPrompt(false);
    closeEntry();
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

  // const renameEntryFromMenu = (entryId: string) => {
  //   const entry = entries.find(
  //     (currentEntry) => currentEntry.id === entryId
  //   );

  //   if (!entry) {
  //     return;
  //   }

  //   setSelectedEntryId(entryId);
  //   setEntryName(entry.title);
  //   setIsRenamingEntry(true);
  //   setContextEntryId(null);
  // };
  const renameEntryFromMenu = (entryId: string) => {
    const entry = findEntryById(entryId);

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

  // const saveEntryName = async () => {
  //   if (!selectedEntry) {
  //     return;
  //   }

  //   const newName = entryName.trim();

  //   if (!newName) {
  //     alert("Please enter a name for the entry.");
  //     return;
  //   }

  //   const updatedAt = new Date().toISOString();

  //   const updatedEntry: JournalEntry = {
  //     ...selectedEntry,
  //     title: newName,
  //     updatedAt,
  //   };

  //   try {
  //     await saveEntry(updatedEntry);

  //     setEntries((current) =>
  //       current.map((entry) =>
  //         entry.id === selectedEntry.id ? updatedEntry : entry
  //       )
  //     );

  //     setIsRenamingEntry(false);
  //     setEntryName("");
  //   } catch (error) {
  //     console.error("could not rename entry:", error);
  //     alert("could not rename the entry.");
  //   }
  // };
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

    if (draftEntry?.id === selectedEntry.id) {
      setDraftEntry(updatedEntry);
      setIsRenamingEntry(false);
      setEntryName("");
      return;
    }

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

  // const deleteEntryFromMenu = async (entryId: string) => {
  //   const entry = entries.find(
  //     (currentEntry) => currentEntry.id === entryId
  //   );

  //   if (!entry) {
  //     return;
  //   }

  //   const confirmed = window.confirm(
  //     `dɘlɘtɘ"${entry.title}"?\n\nthis will permanently delete the entry & all of its writing, recordings, images, GIFs, & videos from this device`
  //   );

  //   if (!confirmed) {
  //     return;
  //   }

  //   try {
  //     await deleteEntry(entryId);

  //     setEntries((current) =>
  //       current.filter((currentEntry) => currentEntry.id !== entryId)
  //     );

  //     setContextEntryId(null);

  //     if (selectedEntryId === entryId) {
  //       setSelectedEntryId(null);
  //     }
  //   } catch (error) {
  //     console.error("could not delete entry:", error);
  //     alert("could not delete the entry.");
  //   }
  // };

  const deleteEntryFromMenu = async (entryId: string) => {
    const entry = findEntryById(entryId);

    if (!entry) {
      return;
    }

    if (draftEntry && draftEntry.id === entryId) {
      setDraftEntry(null);
      setContextEntryId(null);

      if (selectedEntryId === entryId) {
        closeEntry();
      }
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

  const cancelWriting = () => {
    setWriting("");
    setSessionStartedAt(null);
  };

  // const finishWriting = async () => {
  //   if (!selectedEntryId || !sessionStartedAt) {
  //     return;
  //   }

  //   if (!writing.trim()) {
  //     cancelWriting();
  //     return;
  //   }

  //   const endedAt = new Date().toISOString();

  //   const newBlock: TextBlock = {
  //     id: crypto.randomUUID(),
  //     type: "text",
  //     content: writing.trim(),
  //     startedAt: sessionStartedAt,
  //     endedAt,
  //   };

  //   const currentEntry = entries.find(
  //     (entry) => entry.id === selectedEntryId
  //   );

  //   if (!currentEntry) {
  //     return;
  //   }

  //   const updatedEntry: JournalEntry = {
  //     ...currentEntry,
  //     updatedAt: endedAt,
  //     blocks: [...currentEntry.blocks, newBlock],
  //   };

  //   try {
  //     await saveEntry(updatedEntry);

  //     setEntries((current) =>
  //       current.map((entry) =>
  //         entry.id === selectedEntryId ? updatedEntry : entry
  //       )
  //     );

  //     setWriting("");
  //     setSessionStartedAt(null);
  //   } catch (error) {
  //     console.error("could not save writing:", error);
  //     alert("could not save your writing.");
  //   }
  // };

  const finishWriting = async () => {
    if (!selectedEntryId || !sessionStartedAt) {
      return;
    }

    if (!writing.trim()) {
      cancelWriting();
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

    const currentEntry = getCurrentEntryForEdit();

    if (!currentEntry) {
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: endedAt,
      blocks: [...currentEntry.blocks, newBlock],
    };

    try {
      await persistEntryUpdate(updatedEntry);

      setWriting("");
      setSessionStartedAt(null);
    } catch (error) {
      console.error("could not save writing:", error);
      alert("could not save your writing.");
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

        setAudioName("no titlɘ ¿");

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
      console.error("could not access microphone:", error);

      alert("microphone access is required to record audio.");
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

    const currentEntry =
      entries.find((entry) => entry.id === selectedEntryId) ??
      (draftEntry?.id === selectedEntryId ? draftEntry : null);

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

      setEntries((current) => {
        const exists = current.some(
          (entry) => entry.id === updatedEntry.id
        );

        if (exists) {
          return current.map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry
          );
        }

        return [updatedEntry, ...current];
      });

      setDraftEntry(null);

      setPendingAudio(null);
      setAudioName("untitled recording");
    } catch (error) {
      console.error("could not save recording:", error);
      alert("could not save the recording.");
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

  const openFilePicker = () => {
      fileInputRef.current?.click();
    };

    const handleFileSelected = (
      event: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file = event.target.files?.[0];

      if (!file) {
        return;
      }

      const fileExtension = file.name.includes(".")
        ? file.name.substring(file.name.lastIndexOf(".")).toLowerCase()
        : "";

      setPendingFile({
        blob: file,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileExtension,
      });

      setFileName(
        file.name.replace(/\.[^/.]+$/, "") || "Untitled file"
      );

      event.target.value = "";
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
      file.name.replace(/\.[^/.]+$/, "") || "no titlɘ ¿"
    );

    event.target.value = "";
  };



  const savePendingFile = async () => {
    console.log("SAVE FILE");
    console.log("selectedEntryId:", selectedEntryId);
    console.log("draftEntry:", draftEntry);
    console.log("pendingFile:", pendingFile);
    if (!selectedEntryId || !pendingFile) {
      return;
    }

    const addedAt = new Date().toISOString();

    const newBlock: FileBlock = {
      id: crypto.randomUUID(),
      type: "file",
      name: fileName.trim() || "Untitled file",
      fileBlob: pendingFile.blob,
      mimeType: pendingFile.mimeType,
      fileExtension: pendingFile.fileExtension,
      startedAt: addedAt,
      endedAt: addedAt,
    };

    const currentEntry =
      entries.find((entry) => entry.id === selectedEntryId) ??
      (draftEntry?.id === selectedEntryId ? draftEntry : null);
    /////
    console.log("currentEntry:", currentEntry);
    //////

    if (!currentEntry) {
      console.error(
        "Could not save file: no current entry found for",
        selectedEntryId
      );
      return;
    }

    const updatedEntry: JournalEntry = {
      ...currentEntry,
      updatedAt: addedAt,
      blocks: [...currentEntry.blocks, newBlock],
    };

    /////
    console.log("updatedEntry:", updatedEntry);
    console.log("newBlock:", newBlock);
    //////////


    try {
      await saveEntry(updatedEntry);

      setEntries((current) => {
        const exists = current.some(
          (entry) => entry.id === updatedEntry.id
        );

        if (exists) {
          return current.map((entry) =>
            entry.id === updatedEntry.id
              ? updatedEntry
              : entry
          );
        }

        return [updatedEntry, ...current];
      });

      setDraftEntry(updatedEntry);
      setPendingFile(null);
      setFileName("no titlɘ ¿");

    } catch (error) {
      console.error("could not save file:", error);
      alert("could not save the file.");
    }
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

    const currentEntry =
      entries.find((entry) => entry.id === selectedEntryId) ??
      (draftEntry?.id === selectedEntryId ? draftEntry : null);

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

      setEntries((current) => {
        const exists = current.some(
          (entry) => entry.id === updatedEntry.id
        );

        if (exists) {
          return current.map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry
          );
        }

        return [updatedEntry, ...current];
      });

      setDraftEntry(null);

      if (mediaPreviewUrl) {
        URL.revokeObjectURL(mediaPreviewUrl);
      }

      setPendingMedia(null);
      setMediaPreviewUrl(null);
      setMediaName("untitled media");
    } catch (error) {
      console.error("could not save media:", error);
      alert("could not save the media.");
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

  // const selectedEntry = entries.find(
  //   (entry) => entry.id === selectedEntryId
  // );
  const selectedEntry = getCurrentEntryForEdit();

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

          <button className="back-button" onClick={attemptCloseEntry} aria-label="Back">
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
      nvm
    </button>
  </div>
</section>
    ) : (
      <>
        <div className="entry-title-row">
          <h1>{selectedEntry.title}</h1>
          {!selectMode ? (
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
                  nvm
                </button>
              </div>
            ) : null}
          </div>
          ) : null}
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
          <span className="action-icon">writɘ</span>
        </button>

        <button
          onClick={startRecording}
          aria-label="Record"
          title="Record"
        >
          <span className="action-icon">🎙</span>
        </button>

        <button
          onClick={openMediaPicker}
          aria-label="Add media"
          title="Add media"
        >
          <span className="action-icon">📎</span>
        </button>

        <button
          onClick={openFilePicker}
          aria-label="Attach file"
          title="Attach file"
        >
          <span className="action-icon">📄</span>
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
                block.type === "video" ||
                block.type === "file"
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

              {/* <p className="session-time">
                started:{" "}
                {formatDateTime(sessionStartedAt)}
              </p>

              <textarea
                value={writing}
                onChange={(event) =>
                  setWriting(event.target.value)
                }
                placeholder="write whtvr"
                rows={10}
                autoFocus
              />

              <button onClick={finishWriting}>
                done
              </button>

              <button onClick={cancelWriting}>
                nvm
              </button> */}
              <p className="session-time">
                started:{" "}
                {formatDateTime(sessionStartedAt)}
              </p>

              <div className="writing-actions">
                <button onClick={finishWriting}>
                  done
                </button>

                <button onClick={cancelWriting}>
                  nvm
                </button>
              </div>

              <textarea
                value={writing}
                onChange={(event) =>
                  setWriting(event.target.value)
                }
                placeholder="write whatever's on ur mind..."
                autoFocus
              />

            </section>
          ) : null}

          {/* RECORDING */}

          {isRecording ? (
            <section className="composer-section" ref={recordingSectionRef}>

              {/* <h2>r e c o r d 🎙 n g</h2> */}

              <p className="recording-time">
                {formatDuration(recordingDuration)}
              </p>

              <p>
                started:{" "}
                {recordingStartedAt
                  ? formatDateTime(recordingStartedAt)
                  : ""}
              </p>

              <button onClick={stopRecording}>
                ■
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
              <div className="pending-media-layout">

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
                  save
                </button>

              </div>
            </div>

            </section>
          ) : null}



        {/* PENDING FILE */}

{pendingFile ? (
  <section className="composer-section" ref={pendingFileSectionRef}>
    <div className="pending-file-layout">

      <h2>
        📄 File
      </h2>

      <p className="file-preview-name">
        {pendingFile.fileName}
      </p>

      <p className="file-preview-type">
        {pendingFile.fileExtension || "file"}
        {" · "}
        {pendingFile.mimeType}
      </p>

      <label>
        Name

        <input
          type="text"
          value={fileName}
          onChange={(event) =>
            setFileName(event.target.value)
          }
        />
      </label>

      <div className="button-row">

        <button
          onClick={() => {
            setPendingFile(null);
            setFileName("Untitled file");
          }}
        >
          dɘlɘtɘ
        </button>

        <button onClick={savePendingFile}>
          savɘ
        </button>

      </div>

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
          

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt,.mp3,.wav,.m4a,.ogg,.aac"
              onChange={handleFileSelected}
              style={{ display: "none" }}
            />
        </div>



        {showBlankEntryPrompt ? (
  <div className="blank-entry-overlay">
    <div className="blank-entry-dialog">
      <p>save the entry still even tho blank?</p>

      <div className="button-row">
        <button onClick={discardBlankEntryAndClose}>
          nevermind
        </button>

        <button onClick={saveBlankEntryAndClose}>
          savɘ
        </button>
      </div>
    </div>
  </div>
) : null}

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
                ovɘrthinkɘr
              </h1>
            </div>

            <p className="tagline">
              a place for everything on ur mind
            </p>

          </div>
        </header>

        {/* DASHBOARD ACTIONS */}

        <section>

          <div className="dashboard-actions">

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

            <button
              className="select-button"
              onClick={toggleSelectMode}
            >
              {selectMode ? "nvm" : "select"}
            </button>

          </div>

          {/* BULK ACTIONS */}

          {selectMode && entries.length > 0 ? (
            <div className="bulk-actions">

              <button className="check-button" onClick={toggleSelectAll}>
                {selectedEntryIds.length === entries.length
                  ? "uncheck all"
                  : "check all"}
              </button>

              <button
                className="bulk-delete-button"
                onClick={deleteSelectedEntries}
                disabled={selectedEntryIds.length === 0}
              >
                dɘlɘtɘ
              </button>

            </div>
          ) : null}

          {/* ENTRIES */}

          {entries.length === 0 ? (

            <div className="empty-state">
              <p>
                woa, emptyy y ... anyway, start writing whenever u're ready :)
              </p>
            </div>

          ) : (

            <div className="entry-list">

              {entries.map((entry, index) => (

                <article
                  key={entry.id}
                  className={`entry-item ${
                    selectMode &&
                    selectedEntryIds.includes(entry.id)
                      ? "entry-selected"
                      : ""
                  }`}

                  onClick={() => {

                    if (selectMode) {
                      toggleEntrySelection(entry.id);
                      return;
                    }

                    if (contextEntryId) {
                      closeEntryMenu();
                      return;
                    }

                    openEntry(entry.id);
                  }}

                  onPointerDown={() => {
                    if (!selectMode) {
                      startEntryLongPress(entry.id);
                    }
                  }}

                  onPointerUp={cancelEntryLongPress}
                  onPointerLeave={cancelEntryLongPress}

                  onContextMenu={(event) => {
                    event.preventDefault();

                    if (!selectMode) {
                      openEntryMenu(entry.id);
                    }
                  }}
                >

                  {/* CHECKBOX */}

                  {selectMode ? (
                    <input
                      type="checkbox"
                      className="entry-checkbox"
                      checked={selectedEntryIds.includes(entry.id)}
                      onChange={() =>
                        toggleEntrySelection(entry.id)
                      }
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      aria-label={`Select ${entry.title}`}
                    />
                  ) : null}

                  {/* NUMBER */}

                  <div className="entry-number">
                    {(index + 1)
                      .toString()
                      .padStart(2, "0")}
                  </div>

                  {/* ENTRY INFORMATION */}

                  <div className="entry-info">

                    <div className="entry-title-row">

                      <h3 className="entry-title">
                        {entry.title}
                      </h3>

                      {/* THREE DOTS */}

                      {!selectMode ? (
                        <div className="menu-anchor dashboard-entry-menu">

                          <button
                            className="dots-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              openEntryMenu(entry.id);
                            }}
                            aria-label="Entry options"
                          >
                            ⋮
                          </button>

                          {contextEntryId === entry.id ? (
                            <div
                              className="dropdown-menu"
                              onPointerDown={(event) =>
                                event.stopPropagation()
                              }
                              onClick={(event) =>
                                event.stopPropagation()
                              }
                            >

                              <button
                                onClick={() =>
                                  renameEntryFromMenu(entry.id)
                                }
                              >
                                rɘnamɘ
                              </button>

                              <button
                                className="delete-option"
                                onClick={() =>
                                  deleteEntryFromMenu(entry.id)
                                }
                              >
                                dɘlɘtɘ
                              </button>

                              <button
                                onClick={closeEntryMenu}
                              >
                                nvm
                              </button>

                            </div>
                          ) : null}

                        </div>
                      ) : null}

                    </div>

                    {/* ENTRY META */}

                    <div className="entry-meta-row">

                      <span className="entry-meta">
                        {formatDateTime(entry.createdAt)}
                      </span>

                      <span className="entry-divider">
                        ٭
                      </span>

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
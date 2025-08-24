import { useCallback, useMemo, useState } from "react";
import styles from "../../styles/Home.module.css";
import { uploadToYoto } from "../../utils/yotoUpload";
import { uploadManySequential, buildTracksFrom, mergeTracksIntoContent } from "../../utils/yotoBatch";

// --- Types ---
type DeviceInit = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  interval?: number;
};

type Icon = { displayIconId: string; mediaId: string; title: string; url: string };

type TranscodeInfo = {
  transcodedSha256: string;
  duration?: number;
  fileSize?: number;
  format?: string;
};

type MyCard = { cardId: string; title: string };

export default function YotoPage() {
  // Feature flag (do not early-return before hooks)
  const disabled = process.env.NEXT_PUBLIC_ENABLE_YOTO === "false";

  // --- State ---
  const [deviceInit, setDeviceInit] = useState<DeviceInit | null>(null);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [selectedIconMediaId, setSelectedIconMediaId] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  // Batch helpers
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [cardId, setCardId] = useState("");
  const [myCards, setMyCards] = useState<MyCard[]>([]);
  const [uploadPct, setUploadPct] = useState<string>("");

  // --- Auth flows ---
  const startBrowserAuth = useCallback(() => {
    window.location.href = "/api/yoto/auth/start";
  }, []);

  const startDeviceAuth = useCallback(async () => {
    try {
      const r: DeviceInit = await fetch("/api/yoto/auth/device-init").then((r) => r.json());
      setDeviceInit(r);
    } catch (e: any) {
      setLog((l) => l + `
Device init error: ${e?.message || e}`);
    }
  }, []);

  const checkDeviceAuth = useCallback(async () => {
    if (!deviceInit) return;
    try {
      const r = await fetch(
        `/api/yoto/auth/device-poll?device_code=${encodeURIComponent(deviceInit.device_code)}`
      );
      if (r.status === 200) {
        setLog((l) => l + "Device auth complete. You can now use the API.");
      } else {
        const j = await r.json();
        setLog((l) => l + `
Pending: ${JSON.stringify(j.error)}`);
      }
    } catch (e: any) {
      setLog((l) => l + `
Device poll error: ${e?.message || e}`);
    }
  }, [deviceInit]);

  // --- Icons & cover ---
  const fetchIcons = useCallback(async () => {
    try {
      const data = await fetch("/api/yoto/icons").then((r) => r.json());
      const list: Icon[] = data.displayIcons || [];
      setIcons(list);
      setSelectedIconMediaId((prev) => prev || (list[0]?.mediaId ?? null));
    } catch (e: any) {
      setLog((l) => l + `
Icon load error: ${e?.message || e}`);
    }
  }, []);

  const onCoverUrl = useCallback(async (url: string) => {
    try {
      const r = await fetch("/api/yoto/cover-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      }).then((r) => r.json());
      setLog((l) => l + `
Uploaded cover image mediaId: ${r?.mediaId || "(unknown)"}`);
    } catch (e: any) {
      setLog((l) => l + `
Cover upload error: ${e?.message || e}`);
    }
  }, []);

  // --- Single-file Upload & playlist ---
  const onFile = useCallback(
    async (f: File) => {
      try {
        setLog((l) => l + `
Uploading ${f.name} …`);
        const { transcoded }: { transcoded: TranscodeInfo & { transcodedInfo?: any } } = await uploadToYoto(f);
        setLog((l) => l + `
Transcoded: ${transcoded.transcodedSha256}`);

        const info = (transcoded as any).transcodedInfo || {};
        const title = info?.metadata?.title || f.name.replace(/\.[^.]+$/, "");
        const channels = info?.channels === 1 ? "mono" : info?.channels === 2 ? "stereo" : undefined;
        const iconVal = selectedIconMediaId ? `yoto:#${selectedIconMediaId}` : null;

        const chapters = [
          {
            key: "01",
            title,
            display: iconVal ? { icon16x16: iconVal } : undefined,
            tracks: [
              {
                key: "01",
                title,
                trackUrl: `yoto:#${transcoded.transcodedSha256}`,
                duration: info?.duration ?? 1,
                fileSize: info?.fileSize ?? 1,
                format: info?.format || "mp3",
                type: "audio",
                overlayLabel: "1",
                ...(channels ? { channels } : {}),
                display: iconVal ? { icon16x16: iconVal } : undefined,
              },
            ],
          },
        ];

        const body = {
          title,
          content: { chapters },
          metadata: { media: { duration: info?.duration, fileSize: info?.fileSize } },
        };

        const resp = await fetch("/api/yoto/create-playlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const txt = await resp.text();
        if (!resp.ok) throw new Error(txt);
        const created = JSON.parse(txt);

        setLog(
          (l) => l + `
Created playlist cardId: ${created?.card?.cardId || created?.cardId || "(see response)"}`
        );
      } catch (e: any) {
        setLog((l) => l + `
Upload error: ${e?.message || e}`);
      }
    },
    [selectedIconMediaId]
  );

  // --- Batch helpers ---
  const onFilesChosen = useCallback((files: FileList) => {
    const arr = Array.from(files).filter((f) => f.type.startsWith("audio/"));
    setSelectedFiles(arr);
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const j = await fetch("/api/yoto/content-mine").then((r) => r.json());
      const list: MyCard[] = (j.cards || []).map((c: any) => ({
        cardId: c.cardId,
        title: c.title || c.metadata?.title || c.cardId,
      }));
      setMyCards(list);
    } catch (e: any) {
      setLog((l) => l + `
Load my content error: ${e?.message || e}`);
    }
  }, []);

  const createPlaylistFromFiles = useCallback(async () => {
    try {
      if (selectedFiles.length === 0) return;
      setLog((l) => l + `
Batch uploading ${selectedFiles.length} files…`);
      setUploadPct("");
      const res = await uploadManySequential(selectedFiles, (i, total) => setUploadPct(`${i}/${total}`));
      const tracks = buildTracksFrom(res as any, selectedIconMediaId || undefined);
      const title = playlistTitle || `Playlist ${new Date().toLocaleString()}`;
      const body = { title, content: { chapters: [{ key: "01", title, tracks }] } };
      const resp = await fetch("/api/yoto/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const txt = await resp.text();
      if (!resp.ok) throw new Error(txt);
      const j = JSON.parse(txt);
      setLog((l) => l + `
Created playlist cardId: ${j?.card?.cardId || j?.cardId || "(see response)"}`);
    } catch (e: any) {
      setLog((l) => l + `
Batch create error: ${e?.message || e}`);
    }
  }, [selectedFiles, selectedIconMediaId, playlistTitle]);

  const appendFilesToCard = useCallback(async () => {
    try {
      if (!cardId || selectedFiles.length === 0) return;
      setLog((l) => l + `
Appending ${selectedFiles.length} files to ${cardId} …`);
      setUploadPct("");
      const res = await uploadManySequential(selectedFiles, (i, total) => setUploadPct(`${i}/${total}`));
      const newTracks = buildTracksFrom(res as any, selectedIconMediaId || undefined);
      const existing = await fetch(`/api/yoto/get-content?cardId=${encodeURIComponent(cardId)}`).then((r) => r.json());
      const content = mergeTracksIntoContent(existing, newTracks);
      const title = existing?.card?.title || existing?.title || playlistTitle || "";
      const body = { cardId, title, content };
      const resp = await fetch("/api/yoto/create-playlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const txt = await resp.text();
      if (!resp.ok) throw new Error(txt);
      const j = JSON.parse(txt);
      setLog(
        (l) => l + `
Updated playlist ${cardId}. Tracks now: ${content.chapters?.[0]?.tracks?.length ?? "?"}`
      );
    } catch (e: any) {
      setLog((l) => l + `
Append error: ${e?.message || e}`);
    }
  }, [cardId, selectedFiles, selectedIconMediaId, playlistTitle]);

  const selectedIcon = useMemo(
    () => icons.find((i) => i.mediaId === selectedIconMediaId) || null,
    [icons, selectedIconMediaId]
  );

  // --- Render ---
  if (disabled) {
    return (
      <main className={styles.main}>
        <div className={styles.center}>
          <h1>Yoto disabled</h1>
          <p>This environment doesn’t have Yoto enabled.</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.main}>
      <div className={styles.center}>
        <h1>Yoto uploader</h1>
        <p>Authenticate, upload tracks, create playlists, set covers & icons</p>
      </div>

      <div className={styles.grid}>
        {/* Auth */}
        <section className={styles.card}>
          <h3>1) Authenticate</h3>
          <button onClick={startBrowserAuth}>Sign in with Yoto (browser)</button>
          <details>
            <summary>or use headless / device login</summary>
            {!deviceInit ? (
              <button onClick={startDeviceAuth}>Begin device login</button>
            ) : (
              <div>
                <p>
                  Visit: <code>{deviceInit.verification_uri}</code>
                </p>
                <p>
                  Code: <code>{deviceInit.user_code}</code>
                </p>
                {deviceInit.verification_uri_complete && (
                  <a
                    href={deviceInit.verification_uri_complete}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open verification link
                  </a>
                )}
                <div>
                  <button onClick={checkDeviceAuth}>I have authorized</button>
                </div>
              </div>
            )}
          </details>
        </section>

        {/* Icons */}
        <section className={styles.card}>
          <h3>2) Choose an icon</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={fetchIcons}>Load public icons</button>
            {selectedIcon && (
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selectedIcon.url} alt={selectedIcon.title} width={20} height={20} />
                <code>{selectedIcon.mediaId}</code>
              </span>
            )}
          </div>
          <div
            style={{ maxHeight: 200, overflow: "auto", border: "1px solid #eee", marginTop: 8 }}
          >
            {icons.map((i) => (
              <label
                key={i.displayIconId}
                style={{ display: "flex", alignItems: "center", gap: 8, padding: 6, cursor: "pointer" }}
              >
                <input
                  type="radio"
                  name="icon"
                  checked={selectedIconMediaId === i.mediaId}
                  onChange={() => setSelectedIconMediaId(i.mediaId)}
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={i.url} alt={i.title} width={24} height={24} />
                <code>{i.mediaId}</code>
                <span>{i.title}</span>
              </label>
            ))}
          </div>
        </section>

        {/* Single upload */}
        <section className={styles.card}>
          <h3>3) Upload a track</h3>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => e.target.files && onFile(e.target.files[0])}
          />
          <p style={{ fontSize: 12, opacity: 0.8 }}>
            We hash locally, request a signed URL, PUT the file directly to cloud storage, then poll for
            transcoding. When ready, we create a playlist using the transcoded SHA.
          </p>
        </section>

        {/* Cover */}
        <section className={styles.card}>
          <h3>4) Set a cover image</h3>
          <CoverForm onSubmit={onCoverUrl} />
        </section>

        {/* Batch: Create */}
        <section className={styles.card}>
          <h3>5) Batch: create a new playlist</h3>
          <input
            type="text"
            placeholder="Playlist title (optional)"
            value={playlistTitle}
            onChange={(e) => setPlaylistTitle(e.target.value)}
            style={{ width: "100%", marginBottom: 8 }}
          />
          <input type="file" accept="audio/*" multiple onChange={(e) => e.target.files && onFilesChosen(e.target.files)} />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Selected: {selectedFiles.length} files {uploadPct && `(uploaded ${uploadPct})`}
          </div>
          <button disabled={!selectedFiles.length} onClick={createPlaylistFromFiles}>
            Create playlist from files
          </button>
        </section>

        {/* Batch: Append */}
        <section className={styles.card}>
          <h3>6) Batch: append to existing playlist</h3>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <input
              placeholder="Existing cardId (e.g. 31yYU)"
              value={cardId}
              onChange={(e) => setCardId(e.target.value)}
            />
            <button onClick={loadMine}>Load my playlists</button>
          </div>
          {myCards.length > 0 && (
            <div style={{ maxHeight: 160, overflow: "auto", border: "1px solid #eee", marginBottom: 8 }}>
              {myCards.map((c) => (
                <div
                  key={c.cardId}
                  style={{ display: "flex", gap: 8, padding: 6, cursor: "pointer" }}
                  onClick={() => setCardId(c.cardId)}
                >
                  <code>{c.cardId}</code>
                  <span>{c.title}</span>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="audio/*" multiple onChange={(e) => e.target.files && onFilesChosen(e.target.files)} />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 8 }}>
            Selected: {selectedFiles.length} files {uploadPct && `(uploaded ${uploadPct})`}
          </div>
          <button disabled={!cardId || !selectedFiles.length} onClick={appendFilesToCard}>
            Append files to card
          </button>
        </section>
      </div>

      <pre
        style={{
          whiteSpace: "pre-wrap",
          maxHeight: 280,
          overflow: "auto",
          background: "#fafafa",
          padding: 12,
          border: "1px solid #eee",
        }}
      >
        {log}
      </pre>
    </main>
  );
}

function CoverForm({ onSubmit }: { onSubmit: (url: string) => void }) {
  const [url, setUrl] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!url) return;
        onSubmit(url);
        setUrl("");
      }}
    >
      <input
        placeholder="https://...jpg"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }}
      />
      <button type="submit">Upload cover by URL</button>
    </form>
  );
}

import { useCallback, useMemo, useState } from "react";
import styles from "../../styles/Home.module.css";
import { uploadToYoto } from "../../utils/yotoUpload";

// --- Types for small UI helpers ---
type DeviceInit = {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete?: string;
  interval?: number;
};

type Icon = { displayIconId: string; mediaId: string; title: string; url: string };

type TranscodeInfo = { transcodedSha256: string; duration?: number; fileSize?: number; format?: string };

export default function YotoPage() {
  // Env flag — DO NOT return early before hooks; we only branch when rendering.
  const disabled = process.env.NEXT_PUBLIC_ENABLE_YOTO === "false";

  // UI state (hooks must always be called in the same order)
  const [deviceInit, setDeviceInit] = useState<DeviceInit | null>(null);
  const [icons, setIcons] = useState<Icon[]>([]);
  const [selectedIconMediaId, setSelectedIconMediaId] = useState<string | null>(null);
  const [log, setLog] = useState<string>("");

  // --- Auth flows ---
  const startBrowserAuth = useCallback(() => {
    window.location.href = "/api/yoto/auth/start";
  }, []);

  const startDeviceAuth = useCallback(async () => {
    try {
      const r: DeviceInit = await fetch("/api/yoto/auth/device-init").then((r) => r.json());
      setDeviceInit(r);
    } catch (e: any) {
      setLog((l) => l + `\nDevice init error: ${e?.message || e}`);
    }
  }, []);

  const checkDeviceAuth = useCallback(async () => {
    if (!deviceInit) return;
    try {
      const r = await fetch(
        `/api/yoto/auth/device-poll?device_code=${encodeURIComponent(deviceInit.device_code)}`
      );
      if (r.status === 200) {
        setLog((l) => l + "\nDevice auth complete. You can now use the API.");
      } else {
        const j = await r.json();
        setLog((l) => l + `\nPending: ${JSON.stringify(j.error)}`);
      }
    } catch (e: any) {
      setLog((l) => l + `\nDevice poll error: ${e?.message || e}`);
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
      setLog((l) => l + `\nIcon load error: ${e?.message || e}`);
    }
  }, []);

  const onCoverUrl = useCallback(async (url: string) => {
    try {
      const r = await fetch("/api/yoto/cover-from-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      }).then((r) => r.json());
      setLog((l) => l + `\nUploaded cover image mediaId: ${r?.mediaId || "(unknown)"}`);
    } catch (e: any) {
      setLog((l) => l + `\nCover upload error: ${e?.message || e}`);
    }
  }, []);

  // --- Upload & playlist ---
const onFile = useCallback(async (f: File) => {
  try {
    setLog(l => l + `\nUploading ${f.name} …`);

    const { transcoded } = await uploadToYoto(f);
    setLog(l => l + `\nTranscoded: ${transcoded.transcodedSha256}`);

    const info = transcoded.transcodedInfo || {};
    const title = info?.metadata?.title || f.name.replace(/\.[^.]+$/, "");

    // Coerce channels to what the API expects
    const channels =
      info?.channels === 1 ? "mono" :
      info?.channels === 2 ? "stereo" :
      undefined;

    const iconVal = selectedIconMediaId ? `yoto:#${selectedIconMediaId}` : null;

    const chapters = [{
      key: "01",
      title,
      display: iconVal ? { icon16x16: iconVal } : undefined,
      tracks: [{
        key: "01",
        title,
        overlayLabel: "1",
        trackUrl: `yoto:#${transcoded.transcodedSha256}`,
        duration: info?.duration ?? 1,
        fileSize: info?.fileSize ?? 1,
        format: info?.format || "mp3",
        type: "audio",
        ...(channels ? { channels } : {}),
        display: iconVal ? { icon16x16: iconVal } : undefined,
      }],
    }];

    const resp = await fetch("/api/yoto/create-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        content: { chapters },
        // (optional but nice): bubble media info to metadata
        metadata: { media: { duration: info?.duration, fileSize: info?.fileSize } }
      }),
    });

    const text = await resp.text();
    if (!resp.ok) throw new Error(text);
    const created = JSON.parse(text);

    setLog(l => l + `\nCreated playlist cardId: ${created?.card?.cardId || created?.cardId || "(see response)"}`);
  } catch (e: any) {
    setLog(l => l + `\nUpload error: ${e?.message || e}`);
  }
}, [selectedIconMediaId]);

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
        <h1>Yoto Tools (beta)</h1>
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

        {/* Upload */}
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
import React, { useMemo, useState } from "react";
import styles from "../styles/Home.module.css";
import { buildCommands } from "../lib/audioTools";

type OSType = "windows" | "macos";

export default function Popup() {
  const [url, setUrl] = useState("");
  const [timestamps, setTimestamps] = useState("");
  const [os, setOs] = useState<OSType>("windows");
  const [generated, setGenerated] = useState(false);

  const { windows, macos, chapters } = useMemo(() => buildCommands(url, timestamps), [url, timestamps]);
  const commands = os === "windows" ? windows : macos;
  const isYouTubeOrBandcamp = /youtu\.?be|youtube\.com|bandcamp\.com/.test(url);

  function openFullToolbox() {
    if (typeof window !== "undefined") {
      window.location.href = "/toolbox?view=sidebar";
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.topnav}>
        <div className={styles.topnavInner}>
          <div className={styles.brand}>yoto toolbox</div>
          <div className={styles.topnavLinks}>
            <a className={`${styles.topnavLink} ${styles.active}`}>popup</a>
            <a className={styles.topnavLink} onClick={openFullToolbox}>open full toolbox →</a>
          </div>
        </div>
      </div>

      <main className={styles.mainView}>
        <h1 className={styles.title}>Yoto toolbox</h1>

        <div className={styles.introBox}>
          <p><strong>Command tools</strong> — generate safe, local commands for yt-dlp + ffmpeg. No downloads happen inside the extension.</p>
        </div>

        <input className={styles.inputBase} placeholder="youtube or bandcamp url" value={url} onChange={(e)=>setUrl(e.target.value)} />
        <textarea className={styles.textareaBase} rows={6} placeholder="timestamps (e.g. 00:00 intro) or WebVTT" value={timestamps} onChange={(e)=>setTimestamps(e.target.value)} />

        <div className={styles.messageContainer}>
          {!url && timestamps && (<p className={styles.errorMessage}>⚠ missing source url</p>)}
          {url && !isYouTubeOrBandcamp && (<p className={styles.infoMessage}>ℹ this mockup recognizes youtube/bandcamp for commands</p>)}
          {url && isYouTubeOrBandcamp && timestamps.trim() && chapters.length === 0 && (
            <p className={styles.errorMessage}>⚠ no valid timestamps found</p>
          )}
          {url && isYouTubeOrBandcamp && chapters.length > 0 && (
            <p className={styles.successMessage}>✓ found {chapters.length} chapter(s)</p>
          )}
        </div>

        <button className={styles.generateButton} disabled={!url} onClick={()=>setGenerated(true)}>generate</button>

        {(generated || (!generated && (url || timestamps))) && (
          <>
            <div className={styles.commandActions} style={{ marginTop: 10 }}>
              <button className={`${styles.actionButton} ${os === "windows" ? styles.active : ""}`} onClick={()=>setOs("windows")}>windows</button>
              <button className={`${styles.actionButton} ${os === "macos" ? styles.active : ""}`} onClick={()=>setOs("macos")}>mac/linux</button>
            </div>

            <section className={styles.commandOutput}>
              <pre>{commands.join("\n")}</pre>
            </section>
            <div className={styles.commandActions}>
              <button className={styles.actionButton} onClick={()=>navigator.clipboard.writeText(commands.join("\n"))}>copy commands</button>
              <button className={styles.actionButton} onClick={()=>console.log("download script", os)}>download script</button>
              <button className={styles.actionButton} onClick={()=>{ setUrl(""); setTimestamps(""); setGenerated(false); }}>reset</button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

import React from "react";
import styles from "../styles/Home.module.css";

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        <details open>
          <summary><h2>Yoto / MYO manager</h2></summary>
          <div className={styles.sidebarSection}>
            <div className={styles.disclaimer}>Playlists (mock). Create, refresh, edit.</div>
            <div className={styles.commandActions}>
              <button className={styles.actionButton} onClick={()=>console.log("create playlist")}>create playlist</button>
              <button className={styles.actionButton} onClick={()=>console.log("refresh")}>refresh</button>
            </div>
            <ul>
              <li>Bedtime Stories <a className={styles.topnavLink} onClick={()=>console.log("edit Bedtime Stories")}>edit</a></li>
              <li>Math Songs <a className={styles.topnavLink} onClick={()=>console.log("edit Math Songs")}>edit</a></li>
            </ul>
          </div>

          <div className={styles.sidebarSection}>
            <h3>Edit playlist</h3>
            <p>Rename, set description, reorder/remove tracks, set cover & per-track icons.</p>
            <div className={styles.commandActions}>
              <button className={styles.actionButton}>rename</button>
              <button className={styles.actionButton}>change cover</button>
              <button className={styles.actionButton}>manage icons</button>
            </div>
          </div>
        </details>

        <details open>
          <summary><h2>MYO export</h2></summary>
          <div className={styles.sidebarSection}>
            <label>select playlist</label>
            <select className={styles.inputBase} defaultValue="">
              <option value="" disabled>— select —</option>
              <option>Bedtime Stories</option>
              <option>Math Songs</option>
            </select>
            <div className={styles.commandActions}>
              <button className={styles.actionButton} onClick={()=>console.log("export mp3")}>export as mp3</button>
              <button className={styles.actionButton} onClick={()=>console.log("export zip")}>export as zip</button>
            </div>
          </div>
        </details>

        <details open>
          <summary><h2>Archive.org import</h2></summary>
          <div className={styles.sidebarSection}>
            <input className={styles.inputBase} placeholder="search archive.org (audiobooks, albums, lectures)" />
            <div className={styles.disclaimer}>Search results (mock)</div>
            <ul>
              <li>LibriVox – Alice in Wonderland <a className={styles.topnavLink} onClick={()=>console.log("add to export queue")}>add</a></li>
              <li>Beethoven – Piano Sonatas <a className={styles.topnavLink} onClick={()=>console.log("add to export queue")}>add</a></li>
            </ul>
            <div className={styles.commandActions}>
              <button className={styles.actionButton} onClick={()=>console.log("export queued items")}>export selection to zip</button>
            </div>
          </div>
        </details>

        <details>
          <summary><h2>Help & requirements</h2></summary>
          <div className={styles.sidebarSection}>
            <div className={styles.disclaimer}><strong>Install tools</strong> (optional, for commands)</div>
            <div className={styles.commandOutput}><pre>winget install -e --id yt-dlp.yt-dlp && winget install -e --id FFmpeg.FFmpeg</pre></div>
            <div className={styles.commandOutput}><pre>brew install yt-dlp ffmpeg</pre></div>
          </div>
          <div className={styles.sidebarSection}>
            <div className={styles.disclaimer}><strong>Timestamp formats</strong></div>
            <div>• WebVTT: 00:00:00 --&gt; 00:24:54<br/>• Simple: 0:00 Chapter title</div>
          </div>
        </details>
      </div>
    </aside>
  );
}

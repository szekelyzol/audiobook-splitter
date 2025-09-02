import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";
import Popup from "../components/Popup";
import Sidebar from "../components/Sidebar";

export default function ToolboxRouter() {
  const router = useRouter();
  const view = (router.query.view as string) || "popup";

  if (view === "sidebar") {
    return (
      <div className={styles.container}>
        <div className={styles.topnav}>
          <div className={styles.topnavInner}>
            <div className={styles.brand}>yoto toolbox</div>
            <div className={styles.topnavLinks}>
              <Link className={styles.topnavLink} href={{ pathname: "/toolbox", query: { view: "popup" } }}>popup</Link>
              <Link className={`${styles.topnavLink} ${styles.active}`} href={{ pathname: "/toolbox", query: { view: "sidebar" } }}>full toolbox</Link>
            </div>
          </div>
        </div>

        {/* Left content area (optional) */}
        <main className={styles.mainView}>
          <h1 className={styles.title}>Full toolbox</h1>
          <div className={styles.introBox}>
            <p>Manage MYO playlists, export content, and import from Archive.org. The panel is on the right.</p>
          </div>
        </main>

        {/* Fixed right sidebar */}
        <Sidebar />
      </div>
    );
  }

  // default: popup view
  return <Popup />;
}

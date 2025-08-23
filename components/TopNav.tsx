import Link from "next/link";
import { useRouter } from "next/router";
import styles from "../styles/Home.module.css";


export default function TopNav() {
const { pathname } = useRouter();
const isSplitter = pathname === "/";
const isYoto = pathname.startsWith("/yoto");


return (
<nav className={styles.topnav} aria-label="primary">
<div className={styles.topnavInner}>
<span className={styles.brand}>audio tools</span>
<div className={styles.topnavLinks}>
<Link href="/" className={`${styles.topnavLink} ${isSplitter ? styles.active : ""}`}>splitter</Link>
<Link href="/yoto" className={`${styles.topnavLink} ${isYoto ? styles.active : ""}`}>yoto</Link>
</div>
</div>
</nav>
);
}
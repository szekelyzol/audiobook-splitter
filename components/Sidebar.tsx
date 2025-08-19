import { memo } from 'react';
import styles from '../styles/Home.module.css';
import { PACKAGE_MANAGERS } from '../constants/commands';
import type { AccordionSection } from '../types/ui';

interface SidebarProps {
  openSection: AccordionSection;
  onToggleSection: (section: NonNullable<AccordionSection>) => void;
}

export const Sidebar = memo<SidebarProps>(({ openSection, onToggleSection }) => {
  const copyLine = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Command copied!');
    } catch {
      alert('Copy failed. Please copy manually.');
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.sidebarContent}>
        {/* Info Section */}
        <details open={openSection === 'info'}>
          <summary onClick={(e) => { e.preventDefault(); onToggleSection('info'); }}>
            <h2>info</h2>
          </summary>
          <div className={styles.sidebarSection}>
            <p>This tool is a simple proof of concept. I created it to download audiobooks from youtube and split them into separate chapters.</p>
            <p>You can use it to download and split any kind of audio content from youtube. The original goal was to make life easier for me, a parent, whose daughter finishes audiobooks at an unreasonable pace.</p>
            <p>You can use the output of this tool with a Yoto, or any device that can play mp3 files.</p>

            <div className={styles.disclaimer}>
              <p><strong>Note:</strong> this tool only generates commands that you can use locally on your device. It does not automatically download content from youtube for you, and does not run anything on your device.</p>
              <p>Make sure that you only use it with content that is legally available for you to download.</p>
            </div>
          </div>

            <p>Check out the <a href="https://github.com/szekelyzol/audiobook-splitter/" target="_blank" rel="noopener noreferrer"><strong>GitHub repo</strong></a> for more details.</p>
        </details>

        <hr />

        {/* Requirements Section */}
        <details open={openSection === 'requirements'}>
          <summary onClick={(e) => { e.preventDefault(); onToggleSection('requirements'); }}>
            <h2>requirements</h2>
          </summary>
          <div className={styles.sidebarSection}>
            <p>You need two command‑line tools:</p>
            <p><strong>1. yt-dlp</strong> — downloads the audio</p>
            <p><strong>2. ffmpeg</strong> — splits the chapters</p>
            <p>Both are free and open-source.</p>

            <h3>Install via package manager</h3>
            <p>If you do not have a package manager yet, install WinGet for Windows, or homebrew for macOS.</p>
            <p>You can use these commands to install the required tools automatically:</p>

            <div className={styles.commandOutput}>
              <p>Windows - WinGet</p>
              <pre>{PACKAGE_MANAGERS.WIN_WINGET}</pre>
              <div className={styles.commandActions}>
                <button onClick={() => copyLine(PACKAGE_MANAGERS.WIN_WINGET)} className={styles.actionButton}>
                  copy winget commands
                </button>
              </div>
            </div>

            <div className={styles.commandOutput}>
              <p>macOS - homebrew</p>
              <pre>{PACKAGE_MANAGERS.MAC_BREW}</pre>
              <div className={styles.commandActions}>
                <button onClick={() => copyLine(PACKAGE_MANAGERS.MAC_BREW)} className={styles.actionButton}>
                  copy brew commands
                </button>
              </div>
            </div>

            <h3>install manually</h3>
            <a href="https://github.com/yt-dlp/yt-dlp/wiki/Installation" target="_blank" rel="noopener noreferrer">
              → yt-dlp installation guide
            </a>
            <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">
              → ffmpeg downloads
            </a>
            <div className={styles.disclaimer}>
              <p>finding the right ffmpeg package can be a bit tricky. for windows, download the latest release build directly from here: <a href="https://www.gyan.dev/ffmpeg/builds/#release-builds" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-release-essentials.zip</strong></a></p>
              <p>for macOS, check the stable release here: <a href="https://evermeet.cx/ffmpeg/" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-X.Y.Z.zip</strong></a></p>
              <p>X.Y.Z. is going to be a version number.</p>
            </div>
          </div>
        </details>

        <hr />

        {/* How To Section */}
        <details open={openSection === 'howto'}>
          <summary onClick={(e) => { e.preventDefault(); onToggleSection('howto'); }}>
            <h2>how to use</h2>
          </summary>
          <div className={styles.sidebarSection}>
            <h3>steps</h3>
            <p><strong>1.</strong> Install the required tools.</p>
            <p><strong>2.</strong> Paste a youtube url.</p>
            <p><strong>3.</strong> Paste timestamps (from youtube description/comments).</p>
            <p><strong>4.</strong> Optional: add a custom title.</p>
            <p><strong>5.</strong> Click <em>generate</em> to create the commands.</p>
            <p><strong>6.</strong> Run the generated commands in a terminal.</p>
            <p><strong>7.</strong> Your mp3 tracks should be ready in the output folder.</p>

            <h3>output scenarios</h3>
            <div className={styles.introBox}>
              <p><strong>Single file download, no timestamps:</strong></p>
              <p>• With custom title: Creates <code>your_custom_title.mp3</code></p>
              <p>• Without custom title: Creates <code>youtube_video_title.mp3</code></p>
              <br />
              <p><strong>Split into chapters:</strong></p>
              <p>• With custom title: Creates <code>your_custom_title.mp3</code>, folder <code>your_custom_title_timestamp</code>, and tracks like <code>01_Chapter1.mp3</code></p>
              <p>• Without custom title: Creates <code>full_audio.mp3</code>, folder <code>output_&lt;date-timestamp&gt;</code>, and tracks like <code>01_Chapter1.mp3</code></p>
            </div>

            <h3>timestamp examples</h3>
            <div className={styles.disclaimer}>
              <p>This tool supports some common timestamp formats. Formatting is important, so make sure you check these examples.</p>
              <p>Check the troubleshooting section if you encounter any issues.</p>
            </div>

            <p><strong>Standard WEBVTT:</strong></p>
            <div className={styles.commandOutput}>
              <pre>
                <p>WEBVTT</p>
                <p>00:00:00 --&gt; 00:04:35</p>
                <p>Title 1</p>
                <p>00:04:35 --&gt; 00:09:21</p>
                <p>Title 2</p>
                <p>00:09:21 --&gt; 00:12:08</p>
                <p>Title 3</p>
              </pre>
              <p>
                <a href="https://www.w3.org/TR/webvtt1/#introduction-chapters" target="_blank" rel="noopener noreferrer">
                  See the WEBVTT specs for more info and examples.
                </a>
              </p>
            </div>

            <p><strong>Simple format, with start times only:</strong></p>
            <div className={styles.commandOutput}>
              <pre>
                <p>00:00 Title 1</p>
                <p>04:35 Title 2</p>
                <p>09:21 Title 3</p>
              </pre>
            </div>

            <p><strong>Inverse simple format, with start times only:</strong></p>
            <div className={styles.commandOutput}>
              <pre>
                <p>Title 1 00:00</p>
                <p>Title 2 04:35</p>
                <p>Title 3 09:21</p>
              </pre>
            </div>
          </div>
        </details>

        <hr />

        {/* Troubleshooting Section */}
        <details open={openSection === 'troubleshooting'}>
          <summary onClick={(e) => { e.preventDefault(); onToggleSection('troubleshooting'); }}>
            <h2>troubleshooting</h2>
          </summary>
          <div className={styles.sidebarSection}>
            <p>• The tool checks if the format of the youtube URL you enter is valid or not, but it does not check if there is actual content behind a youtube URL that is otherwise valid.</p>
            <p>• If you use a truncated youtube URL, <code>yt-dlp</code> will throw an error and <code>ffmpeg</code> will not find any files to split. In this scenario, the process will finish without any output.</p>
            <p>• Youtube shorts are currently not supported.</p>

            <br />

            <p>The tool cleans up your input to help you avoid some common issues:</p>
            <p>• missing chapter names or titles will automatically create <em>Untitled</em> files</p>
            <p>• leading numbers and patterns like &quot;1. &quot;, &quot;2: &quot;, &quot;3 - &quot; are removed </p>
            <p>• illegal filename characters, spaces, underscores, etc. are trimmed</p>

            <br />

            <div className={styles.introBox}>
              <p>If the filenames or audio lengths look weird in the output, check your input and the generated commands for incorrect timestamps.</p>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';
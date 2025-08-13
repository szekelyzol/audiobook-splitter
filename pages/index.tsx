import { useState } from 'react';
import styles from '../styles/Home.module.css';

interface Chapter {
  start: string;
  end: string;
  title: string;
}

type OSType = 'windows' | 'macos';

export default function Home() {
  const [sourceUrl, setSourceUrl] = useState('');
  const [timestampInput, setTimestampInput] = useState('');
  const [selectedOS, setSelectedOS] = useState<OSType>('windows');
  const [generatedCommands, setGeneratedCommands] = useState<{ windows: string[], macos: string[] }>({ windows: [], macos: [] });

  const isValidYouTubeUrl = (url: string): boolean => {
    if (!url) return false;
    
    const patterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/youtu\.be\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/,
      /^https?:\/\/m\.youtube\.com\/watch\?v=[\w-]+/,
      /^https?:\/\/(www\.)?youtube-nocookie\.com\/embed\/[\w-]+/,
      /^https?:\/\/(www\.)?youtube\.com\/v\/[\w-]+/
    ];
    
    return patterns.some(pattern => pattern.test(url));
  };

  const parseTimestamps = (input: string): Chapter[] => {
    if (!input.trim()) return [];
    
    const lines = input.split('\n').map(line => line.trim()).filter(line => line !== '');
    const chapters: Chapter[] = [];

    let startIndex = 0;
    if (lines[0] && lines[0].toUpperCase() === 'WEBVTT') {
      startIndex = 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes('-->')) {
        const [start, end = ''] = line.split('-->').map(part => part.trim());
        const title = lines[i + 1]?.trim() || `Chapter ${chapters.length + 1}`;
        
        chapters.push({
          start: normalizeTimestamp(start),
          end: normalizeTimestamp(end),
          title: sanitizeTitle(title)
        });
        i++;
      }
      else if (line.match(/(\d+:[\d:]+)|(\d+\.\s)|(\d+:\s)|(Chapter\s+\d+)/i)) {
        const timeMatch = line.match(/(\d+:[\d:]+)/);
        let title = '';
        let start = '';
        
        if (timeMatch) {
          start = normalizeTimestamp(timeMatch[1]);
          title = line.replace(timeMatch[0], '').replace(/[-–—]/g, '').trim();
        } else {
          const chapterMatch = line.match(/Chapter\s+(\d+)/i);
          if (chapterMatch) {
            title = line;
            start = '00:00:00';
          }
        }
        
        if (start && title) {
          chapters.push({
            start,
            end: '',
            title: sanitizeTitle(title)
          });
        }
      }
    }

    for (let i = 0; i < chapters.length - 1; i++) {
      if (!chapters[i].end) {
        chapters[i].end = chapters[i + 1].start;
      }
    }

    return chapters;
  };

  const normalizeTimestamp = (timestamp: string): string => {
    if (!timestamp) return '';
    
    const cleaned = timestamp.replace(/\.\d+/, '').trim();
    const parts = cleaned.split(':');
    
    if (parts.length === 2) {
      return `00:${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    } else if (parts.length === 3) {
      return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
    }
    
    return cleaned;
  };

  const sanitizeTitle = (title: string): string => {
    if (!title || title.trim() === '') {
      return 'Untitled_Chapter';
    }
    
    let cleaned = title
      .replace(/^Chapter\s+\d+:?\s*/i, '')
      .replace(/^\d+\.\s*/, '')
      .trim();
    
    if (!cleaned || /^\d+$/.test(cleaned)) {
      cleaned = title.trim();
    }
    
    return cleaned
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '')
      .substring(0, 50)
      || 'Untitled_Chapter';
  };

  const generateCommands = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    
    if (!sourceUrl) {
      return;
    }

    const windowsCommands = [];
    const macosCommands = [];

    // If no timestamps, just download the full audio
    if (parsedChapters.length === 0) {
      windowsCommands.push('# Download full audio as single file');
      windowsCommands.push(`.\\yt-dlp -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);
      
      macosCommands.push('# Download full audio as single file');
      macosCommands.push(`yt-dlp -x --audio-format mp3 -o "audiobook.mp3" "${sourceUrl}"`);
      
      setGeneratedCommands({ windows: windowsCommands, macos: macosCommands });
      return;
    }

    // Generate Windows commands
    windowsCommands.push('# Step 1: Download audio from source');
    windowsCommands.push(`.\\yt-dlp -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
    windowsCommands.push('');
    windowsCommands.push('# Step 2: Split audio into chapters');
    windowsCommands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `.\\ffmpeg -i "audiobook.mp3" -ss ${chapter.start}`;
      
      if (chapter.end) {
        cmd += ` -to ${chapter.end}`;
      }
      
      cmd += ` -c copy "${paddedIndex}_${chapter.title}.mp3"`;
      windowsCommands.push(cmd);
    });

    // Generate macOS/Linux commands
    macosCommands.push('# Step 1: Download audio from source');
    macosCommands.push(`yt-dlp -x --audio-format mp3 -o "audiobook.%(ext)s" "${sourceUrl}"`);
    macosCommands.push('');
    macosCommands.push('# Step 2: Split audio into chapters');
    macosCommands.push('');

    parsedChapters.forEach((chapter, index) => {
      const paddedIndex = (index + 1).toString().padStart(2, '0');
      let cmd = `ffmpeg -i "audiobook.mp3" -ss ${chapter.start}`;
      
      if (chapter.end) {
        cmd += ` -to ${chapter.end}`;
      }
      
      cmd += ` -c copy "${paddedIndex}_${chapter.title}.mp3"`;
      macosCommands.push(cmd);
    });

    setGeneratedCommands({ windows: windowsCommands, macos: macosCommands });
  };

// Replace downloadSetupScript() in pages/index.tsx
const downloadSetupScript = () => {
  let scriptContent = '';

  if (selectedOS === 'windows') {
    // Windows: prefer winget -> choco -> scoop, then fallback to local install (no admin)
    scriptContent = `@echo off
setlocal ENABLEDELAYEDEXPANSION

echo ========================================
echo   Audiobook Tools Setup - Windows
echo ========================================
echo.
echo This script installs yt-dlp and ffmpeg using a package manager when possible.
echo Order: winget -> chocolatey -> scoop -> local (no admin).
echo.

:: Create a working folder for local fallback
set "TOOLS_DIR=%CD%\\audiobook-tools"
if not exist "%TOOLS_DIR%" mkdir "%TOOLS_DIR%"

:: Helper: verify commands
where yt-dlp >nul 2>&1 && set HAD_YTDLP=1
where ffmpeg >nul 2>&1 && set HAD_FFMPEG=1

:: ------------------------------------------------
:: 1) Try winget (preferred)
:: ------------------------------------------------
where winget >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [winget] attempting to install yt-dlp and ffmpeg...
  call :winget_try_install yt-dlp.yt-dlp yt-dlp
  call :winget_try_install FFmpeg.FFmpeg ffmpeg
  if not defined HAD_YTDLP (where yt-dlp >nul 2>&1) && if not defined HAD_FFMPEG (where ffmpeg >nul 2>&1) (
    echo [winget] install looks good.
    goto :verify
  )
) else (
  echo [winget] not found.
)

:: ------------------------------------------------
:: 2) Try Chocolatey
:: ------------------------------------------------
where choco >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [choco] attempting to install packages (may require elevation)...
  choco install -y yt-dlp ffmpeg
  if %ERRORLEVEL%==0 goto :verify
) else (
  echo [choco] not found.
)

:: ------------------------------------------------
:: 3) Try Scoop
:: ------------------------------------------------
where scoop >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [scoop] attempting to install buckets/packages...
  :: ensure main bucket exists (usually default)
  scoop bucket add main >nul 2>&1
  scoop install yt-dlp ffmpeg
  if %ERRORLEVEL%==0 goto :verify
) else (
  echo [scoop] not found.
)

:: ------------------------------------------------
:: 4) Local fallback (no admin, portable binaries)
:: ------------------------------------------------
echo [fallback] performing local no-admin install into:
echo   %TOOLS_DIR%
pushd "%TOOLS_DIR%"

echo   - downloading yt-dlp.exe ...
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp.exe
if %ERRORLEVEL% neq 0 (
  echo ERROR: failed to download yt-dlp
  popd & goto :fail
)

echo   - downloading ffmpeg (release essentials) ...
curl -L https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip -o ffmpeg.zip
if %ERRORLEVEL% neq 0 (
  echo ERROR: failed to download ffmpeg
  popd & goto :fail
)

echo   - extracting ffmpeg with PowerShell Expand-Archive ...
powershell -NoProfile -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'ffmpeg' -Force"
if %ERRORLEVEL% neq 0 (
  echo ERROR: failed to extract ffmpeg.zip
  popd & goto :fail
)

for /f "delims=" %%F in ('powershell -NoProfile -Command "(Get-ChildItem -Recurse -Filter ffmpeg.exe -Path ffmpeg | Select-Object -First 1).FullName"') do set "FFMPEG_EXE=%%F"
if not exist "!FFMPEG_EXE!" (
  echo ERROR: could not locate ffmpeg.exe after extraction
  popd & goto :fail
)
copy /y "!FFMPEG_EXE!" "%TOOLS_DIR%\\ffmpeg.exe" >nul
del /q ffmpeg.zip >nul 2>&1
popd

:: Temporarily add to PATH for this session
set "PATH=%TOOLS_DIR%;%PATH%"

:verify
echo.
echo Verifying tools on PATH:
yt-dlp --version || echo (yt-dlp not on PATH)
ffmpeg -hide_banner -version || echo (ffmpeg not on PATH)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo If commands still aren't found, restart your terminal or add the tool location to PATH.
echo.
echo Windows package managers can require elevation; run this in an elevated terminal if prompted.
echo.
pause
exit /b 0

:: --------------- helper labels -----------------
:winget_try_install
REM %1 = winget package id to try, %2 = binary to verify
set "PKGID=%~1"
set "BINARY=%~2"
winget install --silent --accept-package-agreements --accept-source-agreements -e --id "%PKGID%"
where "%BINARY%" >nul 2>&1
exit /b 0

:fail
echo.
echo ========================================
echo   Setup FAILED
echo ========================================
echo You can try running this window as Administrator, or install a package manager:
echo   - winget: Microsoft Store "App Installer"
echo   - Chocolatey: https://chocolatey.org/install
echo   - Scoop: https://scoop.sh
echo Or use the local fallback above manually.
echo.
pause
exit /b 1
`;
  } else {
    // macOS / Linux stays package-manager-first as before
    scriptContent = `#!/bin/bash
set -e

echo "========================================"
echo "  Audiobook Tools Setup - macOS/Linux"
echo "========================================"
echo
echo "This script installs yt-dlp and ffmpeg using your package manager when possible."
echo

OS="$(uname -s)"
read -p "Press Enter to continue, or Ctrl+C to cancel..."

echo
echo "[1/2] Installing yt-dlp..."
if command -v yt-dlp >/dev/null 2>&1; then
  echo "yt-dlp already installed."
else
  if [ "$OS" = "Darwin" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install yt-dlp
    else
      echo "Homebrew not found. Installing yt-dlp via curl to /usr/local/bin (requires sudo)..."
      sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
      sudo chmod a+rx /usr/local/bin/yt-dlp
    fi
  else
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y yt-dlp
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y yt-dlp
    elif command -v yum >/dev/null 2>&1; then
      sudo yum install -y yt-dlp
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm yt-dlp
    elif command -v zypper >/dev/null 2>&1; then
      sudo zypper install -y yt-dlp
    else
      echo "No supported package manager detected; installing yt-dlp with pip for this user..."
      python3 -m pip install --user -U yt-dlp
      echo "Ensure ~/.local/bin is on your PATH."
    fi
  fi
fi

echo
echo "[2/2] Installing ffmpeg..."
if command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg already installed."
else
  if [ "$OS" = "Darwin" ]; then
    if command -v brew >/dev/null 2>&1; then
      brew install ffmpeg
    else
      echo "Please install Homebrew (https://brew.sh) or download a static build."
      exit 1
    fi
  else
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y ffmpeg
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y ffmpeg
    elif command -v yum >/dev/null 2>&1; then
      sudo yum install -y ffmpeg
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm ffmpeg
    elif command -v zypper >/dev/null 2>&1; then
      sudo zypper install -y ffmpeg
    else
      echo "Please install ffmpeg using your distribution's package manager."
      exit 1
    fi
  fi
fi

echo
echo "Verifying tools..."
yt-dlp --version || true
ffmpeg -hide_banner -version || true

echo
echo "========================================"
echo "  Setup Complete!"
echo "========================================"
echo "You can now run the audiobook splitter commands."
echo`;
  }

  const blob = new Blob([scriptContent], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = selectedOS === 'windows' ? 'setup-tools.bat' : 'setup-tools.sh';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  };


  const downloadBatchFile = () => {
    const parsedChapters = parseTimestamps(timestampInput);
    const commands = selectedOS === 'windows' ? generatedCommands.windows : generatedCommands.macos;
    
    let scriptContent = '';
    
    if (selectedOS === 'windows') {
      if (parsedChapters.length === 0) {
        // Single file download
        scriptContent = `@echo off
echo ========================================
echo     Audiobook Downloader
echo ========================================
echo.

echo Downloading audio as single file...
${commands.find(cmd => cmd.includes('yt-dlp')) || ''}

if %ERRORLEVEL% neq 0 (
    echo ERROR: Download failed!
    pause
    exit /b 1
)

echo.
echo ========================================
echo     Download complete!
echo ========================================
echo Your audiobook.mp3 is ready!
pause`;
      } else {
        // Multi-chapter split
        scriptContent = `@echo off
echo ========================================
echo     Audiobook Chapter Splitter
echo ========================================
echo.

echo [1/2] Downloading audio...
${commands.find(cmd => cmd.includes('yt-dlp')) || ''}

if %ERRORLEVEL% neq 0 (
    echo ERROR: Download failed!
    pause
    exit /b 1
)

echo.
echo [2/2] Splitting into ${parsedChapters.length} chapters...
${commands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo.
echo ========================================
echo     Processing complete!
echo ========================================
echo Your chapter files are ready!
pause`;
      }
    } else {
      if (parsedChapters.length === 0) {
        // Single file download
        scriptContent = `#!/bin/bash

echo "========================================"
echo "    Audiobook Downloader"
echo "========================================"
echo

echo "Downloading audio as single file..."
${commands.find(cmd => cmd.includes('yt-dlp')) || ''}

if [ $? -ne 0 ]; then
    echo "ERROR: Download failed!"
    exit 1
fi

echo
echo "========================================"
echo "    Download complete!"
echo "========================================"
echo "Your audiobook.mp3 is ready!"`;
      } else {
        // Multi-chapter split
        scriptContent = `#!/bin/bash

echo "========================================"
echo "    Audiobook Chapter Splitter"
echo "========================================"
echo

echo "[1/2] Downloading audio..."
${commands.find(cmd => cmd.includes('yt-dlp')) || ''}

if [ $? -ne 0 ]; then
    echo "ERROR: Download failed!"
    exit 1
fi

echo
echo "[2/2] Splitting into ${parsedChapters.length} chapters..."
${commands
  .filter(cmd => cmd.includes('ffmpeg'))
  .join('\n')}

echo
echo "========================================"
echo "    Processing complete!"
echo "========================================"
echo "Your chapter files are ready!"`;
      }
    }

    const blob = new Blob([scriptContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = selectedOS === 'windows' ? 'split-audiobook.bat' : 'split-audiobook.sh';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const copyCommands = () => {
    const commands = selectedOS === 'windows' ? generatedCommands.windows : generatedCommands.macos;
    navigator.clipboard.writeText(commands.join('\n'));
    alert('Commands copied to clipboard!');
  };

  const copyLine = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => alert('Command copied!'))
      .catch(() => alert('Copy failed. Please copy manually.'));
  };


  const parsedChapters = parseTimestamps(timestampInput);

  // Easy-install one-liners
  const WIN_WINGET = 'winget install -e --id yt-dlp.yt-dlp && winget install -e --id FFmpeg.FFmpeg';
  const WIN_CHOCO  = 'choco install -y yt-dlp ffmpeg';
  const WIN_SCOOP  = 'scoop install yt-dlp ffmpeg';

  const MAC_BREW  = 'brew install yt-dlp ffmpeg';

  const LNX_APT   = 'sudo apt-get update && sudo apt-get install -y yt-dlp ffmpeg';
  const LNX_DNF   = 'sudo dnf install -y yt-dlp ffmpeg';
  const LNX_PAC   = 'sudo pacman -Sy --noconfirm yt-dlp ffmpeg';
  const LNX_ZYP   = 'sudo zypper install -y yt-dlp ffmpeg';

  return (
    <div className={styles.minimalContainer}>

      {/* Main View */}
      <div className={styles.mainView}>
        <h1 className={styles.minimalTitle}>audiobook splitter</h1>
        
        {/* Intro */}
        <div className={styles.introbox}>
          <p><strong>welcome!</strong></p>
          <p>this tool helps you download audio from youtube and split the resulting file into individual tracks, based on the timestamps.</p>
          <p>it offers a manual and an automated workflow: use the generated command line prompts, or use the script that runs the prompts for you.</p>
          <p>open the sidebar for more details!</p>
        </div>

        <input 
          type="url" 
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="youtube url"
          className={styles.minimalInput}
        />

        <textarea
          value={timestampInput}
          onChange={(e) => setTimestampInput(e.target.value)}
          placeholder="timestamps (e.g. 00:00 Introduction)"
          rows={8}
          className={styles.minimalTextarea}
        />

        {/* Error/Success Messages */}
        {sourceUrl && !isValidYouTubeUrl(sourceUrl) && (
          <div className={styles.errorMessage}>⚠ invalid youtube url format</div>
        )}
        {!sourceUrl && timestampInput && (
          <div className={styles.errorMessage}>⚠ missing youtube url</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && parsedChapters.length === 0 && timestampInput && (
          <div className={styles.errorMessage}>⚠ no valid timestamps found</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && !timestampInput.trim() && (
          <div className={styles.infoMessage}>ℹ no timestamps provided - will download as single mp3 file</div>
        )}
        {sourceUrl && isValidYouTubeUrl(sourceUrl) && parsedChapters.length > 0 && (
          <div className={styles.successMinimal}>✓ found {parsedChapters.length} chapter(s)</div>
        )}

        <button 
          onClick={generateCommands}
          disabled={!sourceUrl || !isValidYouTubeUrl(sourceUrl)}
          className={styles.minimalButton}
        >
          generate
        </button>

        {/* Generated Commands */}
        {(generatedCommands.windows.length > 0 || generatedCommands.macos.length > 0) && (
          <div className={styles.minimalCommands}>
            <div className={styles.osToggle}>
              <button 
                className={selectedOS === 'windows' ? styles.osToggleActive : ''}
                onClick={() => setSelectedOS('windows')}
              >
                windows
              </button>
              <button 
                className={selectedOS === 'macos' ? styles.osToggleActive : ''}
                onClick={() => setSelectedOS('macos')}
              >
                mac/linux
              </button>
            </div>
            <pre>{(selectedOS === 'windows' ? generatedCommands.windows : generatedCommands.macos).join('\n')}</pre>
            <div className={styles.minimalActions}>
              <button onClick={copyCommands} title="Copy commands to clipboard">copy</button>
              <button onClick={downloadBatchFile} title="Download audiobook splitting script">
                .{selectedOS === 'windows' ? 'bat' : 'sh'} audio splitting script
              </button>
              <button onClick={downloadSetupScript} title="Download tool installer script">
                tool setup script
              </button>
              <button onClick={() => setGeneratedCommands({ windows: [], macos: [] })} title="Clear everything">reset</button>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className={`${styles.sidebar} ${styles.sidebarOpen}`}>
        <div className={styles.sidebarContent}>
            
          <details open>
            <summary><h2>info</h2></summary>
            <p>I created this tool to download and split audiobooks from youtube into separate chapters.</p>
            <p>You can obviously use it to download and split any kind of audio content from youtube. Still, the original goal was to make life easier for me, a parent who has a daughter that finishes audiobooks at an unreasonable pace.</p>
            <p>You can use the output of this tool with a Yoto, or any similar device that plays mp3 files.</p>
            
            <div className={styles.disclaimer} style={{ marginTop: 10 }}>
              <p><strong>Note:</strong> this tool only generates commands that you can use locally on your device. It does not automatically download content from youtube for you, and does not run anything on your device.</p>
              <p>Make sure that you only use it with content that is legally available for you to download.</p>
            </div>
          </details>
            
          <hr />
            
          <details>
            <summary><h2>requirements</h2></summary>
            <div className={styles.sidebarSection}>
              <p>You need two command‑line tools:</p>
              <p><strong>1. yt-dlp</strong> — downloads the audio</p>
              <p><strong>2. ffmpeg</strong> — splits the chapters</p>
              <p>install them with your OS package manager for the smoothest experience.</p>
            
              {/* package‑manager one‑liners only (no script download) */}
              <h3 style={{ marginTop: 15 }}>install via package manager</h3>
            
              <p><strong>windows</strong></p>
              <div className={styles.minimalCommands}>
                <p>winget (recommended)</p>
                <pre>{WIN_WINGET}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(WIN_WINGET)}>copy winget</button>
                </div>
                <p>chocolatey</p>
                <pre>{WIN_CHOCO}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(WIN_CHOCO)}>copy choco</button>
                </div>
                <p>scoop</p>
                <pre>{WIN_SCOOP}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(WIN_SCOOP)}>copy scoop</button>
                </div>
              </div>
            
              <p style={{ marginTop: 15 }}><strong>macos</strong></p>
              <div className={styles.minimalCommands}>
                <p>homebrew</p>
                <pre>{MAC_BREW}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(MAC_BREW)}>copy brew</button>
                </div>
              </div>
            
              <p style={{ marginTop: 15 }}><strong>linux</strong></p>
              <div className={styles.minimalCommands}>
                <p>debian/ubuntu</p>
                <pre>{LNX_APT}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(LNX_APT)}>copy apt</button>
                </div>
            
                <p>fedora</p>
                <pre>{LNX_DNF}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(LNX_DNF)}>copy dnf</button>
                </div>
            
                <p>arch</p>
                <pre>{LNX_PAC}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(LNX_PAC)}>copy pacman</button>
                </div>
            
                <p>opensuse</p>
                <pre>{LNX_ZYP}</pre>
                <div className={styles.minimalActions}>
                  <button onClick={() => copyLine(LNX_ZYP)}>copy zypper</button>
                </div>
              </div>

              <p>advanced users can also install manually:</p>
              <a href="https://github.com/yt-dlp/yt-dlp/wiki/Installation" target="_blank" rel="noopener noreferrer">→ yt-dlp installation guide</a>
              <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">→ ffmpeg downloads</a>
            </div>
          </details>
            
          <hr />
            
          <details>
            <summary><h2>how to use</h2></summary>
            <div className={styles.sidebarSection}>
              <h3>steps</h3>
              <p><strong>1.</strong> paste a youtube url (shorts not supported).</p>
              <p><strong>2.</strong> paste timestamps (from description/comments).</p>
              <p><strong>3.</strong> click <em>generate</em> to create commands.</p>
              <p><strong>4.</strong> make sure <code>yt-dlp</code> and <code>ffmpeg</code> are installed via your package manager.</p>
              <p><strong>5.</strong> run the commands in a terminal.</p>
              <p><strong>6.</strong> your mp3 tracks should be ready in the current folder.</p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
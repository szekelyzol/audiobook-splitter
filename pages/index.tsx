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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const downloadSetupScript = () => {
    let scriptContent = '';
    
    if (selectedOS === 'windows') {
      scriptContent = `@echo off
echo ========================================
echo     Audiobook Tools Setup - Windows
echo ========================================
echo.
echo This script will download yt-dlp and ffmpeg for you.
echo.
pause

echo.
echo [1/3] Creating tools folder...
if not exist "audiobook-tools" mkdir audiobook-tools
cd audiobook-tools

echo.
echo [2/3] Downloading yt-dlp...
curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe -o yt-dlp.exe
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to download yt-dlp!
    echo Please download manually from: https://github.com/yt-dlp/yt-dlp/releases
    pause
    exit /b 1
)

echo.
echo [3/3] Downloading ffmpeg...
echo Please wait, this may take a few minutes...
curl -L https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip -o ffmpeg.zip
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to download ffmpeg!
    echo Please download manually from: https://www.gyan.dev/ffmpeg/builds/
    pause
    exit /b 1
)

echo.
echo Extracting ffmpeg...
tar -xf ffmpeg.zip --strip-components=1 --wildcards "*/bin/ffmpeg.exe"
if %ERRORLEVEL% neq 0 (
    echo ERROR: Failed to extract ffmpeg!
    echo Please extract manually and copy ffmpeg.exe to this folder
    pause
    exit /b 1
)

echo.
echo Cleaning up...
del ffmpeg.zip

echo.
echo ========================================
echo     Setup Complete!
echo ========================================
echo.
echo Your tools are ready in the 'audiobook-tools' folder.
echo Copy your audiobook commands into this folder and run them!
echo.
pause`;
    } else {
      scriptContent = `#!/bin/bash

echo "========================================"
echo "    Audiobook Tools Setup - Mac/Linux"
echo "========================================"
echo
echo "This script will help you install yt-dlp and ffmpeg."
echo
echo "Press Enter to continue..."
read

# Detect OS
OS="$(uname -s)"

echo
echo "[1/2] Installing yt-dlp..."

if command -v yt-dlp &> /dev/null; then
    echo "yt-dlp is already installed!"
else
    if [ "$OS" = "Darwin" ]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Using Homebrew to install yt-dlp..."
            brew install yt-dlp
        else
            echo "Installing via curl..."
            sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
            sudo chmod a+rx /usr/local/bin/yt-dlp
        fi
    else
        # Linux
        if command -v pip3 &> /dev/null; then
            echo "Installing via pip..."
            pip3 install --user yt-dlp
        else
            echo "Installing via curl..."
            sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp
            sudo chmod a+rx /usr/local/bin/yt-dlp
        fi
    fi
fi

echo
echo "[2/2] Installing ffmpeg..."

if command -v ffmpeg &> /dev/null; then
    echo "ffmpeg is already installed!"
else
    if [ "$OS" = "Darwin" ]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Using Homebrew to install ffmpeg..."
            brew install ffmpeg
        else
            echo "Please install Homebrew first or download ffmpeg from:"
            echo "https://evermeet.cx/ffmpeg/"
            exit 1
        fi
    else
        # Linux
        if command -v apt-get &> /dev/null; then
            echo "Using apt to install ffmpeg..."
            sudo apt-get update && sudo apt-get install -y ffmpeg
        elif command -v yum &> /dev/null; then
            echo "Using yum to install ffmpeg..."
            sudo yum install -y ffmpeg
        elif command -v pacman &> /dev/null; then
            echo "Using pacman to install ffmpeg..."
            sudo pacman -S ffmpeg
        else
            echo "Please install ffmpeg using your package manager"
            exit 1
        fi
    fi
fi

echo
echo "========================================"
echo "    Setup Complete!"
echo "========================================"
echo
echo "Both yt-dlp and ffmpeg are ready to use!"
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

  const parsedChapters = parseTimestamps(timestampInput);

  return (
    <div className={styles.minimalContainer}>
      {/* Sidebar Toggle */}
      <button 
        className={styles.sidebarToggle}
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        ☰
      </button>

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
      <div className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarContent}>
          <h2>info</h2>
          <p>i created this tool to download and split audiobooks from youtube into separate chapters.</p>
          <p>you can obviously use it to download and split any kind of audio content from youtube. still, the original goal was to make life easier for me, a parent who has a daughter that finishes audiobooks at an unreasonable pace.</p>
          <p>i can use the output of this tool with a Yoto, or any similar device that plays mp3 files.</p>

          {/* Instructions */}
          <div className={styles.sidebarSection}>
            <h3>how to use</h3>
            <p><strong>1. paste a youtube url.</strong> youtube shorts are not supported.</p>
            <p><strong>2. write or paste timestamps.</strong> you can usually find these in the youtube video description or in the comment section.</p>
            <p><strong>3. click on generate to create commands and scripts.</strong> you can toggle between windows and mac/linux outputs.</p>
            <p><strong>4. make sure you have the correct tools set up to run the generated commands.</strong> you can download and run the installer script to automatically set up <code>yt-dlp</code> and <code>ffmpeg</code>, or you can manually set up your environment based on the <strong>required tools</strong> below.</p>
            <p><strong>5. run the audio splitting commands.</strong> you can download and run the audiobook splitting script that does everything for you automatically, or you can run the resulting commands manually in a terminal.
            the commands and the script work in the same way: they grab the audio file from youtube with <code>yt-dlp</code> and split it into individual tracks using <code>ffmpeg</code>.</p>
            <p>you must do this step in the same folder where both the <code>yt-dlp</code> and the <code>ffmpeg</code> executables are located.</p>
            <p><strong>6. check the output.</strong> it should be a bunch of mp3 files ready for you to upload to whatever device you are using.</p>
            
          </div>

          {/* Requirements */}
          <div className={styles.sidebarSection}>
            <h3>required tools</h3>
            <p><strong>1. yt-dlp - downloads audio</strong></p>
            <a href="https://github.com/yt-dlp/yt-dlp/wiki/Installation" target="_blank" rel="noopener noreferrer">
              → download yt-dlp executable
            </a>
            <p><strong>2. ffmpeg - splits chapters</strong></p>
            <a href="https://ffmpeg.org/download.html" target="_blank" rel="noopener noreferrer">
              → download ffmpeg executables
            </a>
            <div className={styles.disclaimer}>
              <p>if you decide to set up your environment manually, you need to put all tools into the same folder for the commands to work!</p>
              <p>for example, put both the <code>yt-dlp</code> and the <code>ffmpeg</code> executable files into a folder called <code>audiobook-tools</code>. when you get to step 5, navigate to the same folder in your terminal before running the commands.</p>
              <p>also, finding the right ffmpeg package can be a bit tricky. for windows, you can download the latest release build directly from here: <a href="https://www.gyan.dev/ffmpeg/builds/#release-builds" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-release-essentials.zip</strong></a></p>
              <p>for macos, check the stable release here:<a href="https://evermeet.cx/ffmpeg/" target="_blank" rel="noopener noreferrer"><strong>ffmpeg-X.Y.Z.zip</strong></a></p>
              <p>X.Y.Z. is going to be a version number.</p>
              <p>for linux, you most probably do not need help.</p>
            </div> 
          </div>

          {/* Formats */}
          <div className={styles.sidebarSection}>
            <h3>supported timestamp formats</h3>
            <p>• standard webvtt: 00:00:00 --&gt; 00:24:54</p>
            <p>• simple format: 0:00 chapter title</p>
            <p><a href="https://www.w3.org/TR/webvtt1/#introduction-chapters" target="_blank" rel="noopener noreferrer">
              see the webvtt specs for more info and examples
            </a></p>
          </div>

          {/* Legal */}
          <div className={styles.disclaimer}>
            <p><strong>note:</strong> this tool only generates commands that you can use locally on your device. it does not automatically download content from youtube for you, and does not run anything on your device.</p>
            <p>using it does require some basic understanding of using terminals and installing stuff, but i am sure you will manage.</p>
            <p>just make sure that you only use it with content that is legally available for you to download.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
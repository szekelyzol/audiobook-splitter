# Audiobook splitter

A simple web tool that helps you download audio from YouTube and split it into individual tracks based on timestamps. Perfect for creating chapter-based audiobooks that work with devices like Yoto players or any MP3-compatible device.

I created this as a proof of concept, and to play around with Next.js.

## What it does

- Generates command-line instructions for downloading audio from YouTube
- Lets you work locally on your device (no uploads or cloud processing)
- Splits audio files into separate tracks using timestamps
- Supports multiple timestamp formats (WEBVTT, simple timestamps)
- Creates organized output folders with properly named files

## Important

This tool **only generates commands** that you run locally on your device. It does not automatically download content from YouTube, and does not run anything on your device. Please ensure you only use it with content that is legally available for you to download.

## Live demo

Visit the live version [here](https://szekelyzol.github.io/audiobook-splitter/).

## Prerequisites

To use the generated commands, you need these command-line tools installed:

### Required tools

- **[yt-dlp](https://github.com/yt-dlp/yt-dlp/wiki/Installation)** - Downloads audio from YouTube
- **[ffmpeg](https://ffmpeg.org/download.html)** - Splits audio into chapters

### Installing required packages

**Windows (WinGet):**
```bash
winget install -e --id yt-dlp.yt-dlp
winget install -e --id Gyan.FFmpeg
```

**macOS (Homebrew):**
```bash
brew install yt-dlp ffmpeg
```

## Using the tool

1. **Enter YouTube URL** - Paste any valid YouTube video URL
3. **Add timestamps** (optional) - Paste chapter/track timestamps from video description or comments
2. **Add custom title** (optional) - Provide a custom name for your files
4. **Generate commands** - Click the generate button to create command-line instructions
5. **Run commands** - Copy and run the generated commands locally in your terminal

### Output

Your MP3 track(s) will be available in the folder where you run the generated commands. Your timestamp and custom title inputs will determine the output:

**No timestamp:**
- the output will be a single MP3 file with a custom title or the YouTube video's title

**With timestamps:**
- **With custom title**: 
  - a full audio file called `Your_Custom_Title.mp3`
  - an output folder for the split MP3 files called `Your_Custom_Title_<date-time>`
  - the split MP3 files, titled according to the timestamp input: `01_Chapter1.mp3`, `02_Chapter2.mp3`, etc.
- **Without custom title**:
  - a full audio file called `full_audio.mp3`
  - an output folder for the split MP3 files called: `output_20250118T143022`
  - the split MP3 files, titled according to the timestamp input: `01_Chapter1.mp3`, `02_Chapter2.mp3`, etc.

### Supported timestamp formats

**WEBVTT:**
```
WEBVTT
00:00:00 --> 00:04:35
Chapter 1: Introduction
00:04:35 --> 00:09:21
Chapter 2: Main Content
```

**Simple format:**
```
00:00 Introduction
04:35 Main Content
09:21 Conclusion
```

**Inverse format:**
```
Introduction 00:00
Main Content 04:35
Conclusion 09:21
```

### Example generated commands

**No timestamps:**

*With custom title "My Audiobook":*
```bash
yt-dlp -x --audio-format mp3 -o "My_Audiobook.%(ext)s" "https://youtube.com/watch?v=..."
```
*Result: `My_Audiobook.mp3`*

*Without custom title:*
```bash
yt-dlp -x --audio-format mp3 -o "%(title).100s.%(ext)s" "https://youtube.com/watch?v=..."
```
*Result: `YouTube_video_title.mp3`*

**With timestamps:**

*With custom title "My Audiobook":*
```bash
# Step 1: Download audio from source
yt-dlp -x --audio-format mp3 -o "My_Audiobook.%(ext)s" "https://youtube.com/watch?v=..."

# Step 2: Make output folder
mkdir "My_Audiobook_20250118T143022"

# Step 3: Split audio into chapters
ffmpeg -i "My_Audiobook.mp3" -ss 00:00:00 -to 00:04:35 -c copy "My_Audiobook_20250118T143022/01_Introduction.mp3"
ffmpeg -i "My_Audiobook.mp3" -ss 00:04:35 -to 00:09:21 -c copy "My_Audiobook_20250118T143022/02_Main_Content.mp3"
```

*Without custom title:*
```bash
# Step 1: Download audio from source
yt-dlp -x --audio-format mp3 -o "full_audio.%(ext)s" "https://youtube.com/watch?v=..."

# Step 2: Make output folder
mkdir "output_20250118T143022"

# Step 3: Split audio into chapters
ffmpeg -i "full_audio.mp3" -ss 00:00:00 -to 00:04:35 -c copy "output_20250118T143022/01_Introduction.mp3"
ffmpeg -i "full_audio.mp3" -ss 00:04:35 -to 00:09:21 -c copy "output_20250118T143022/02_Main_Content.mp3"
```

## Running the tool locally

To run the tool in locally on your device, go through these steps:

1. **Fork this repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/<YOUR-USERNAME>/audiobook-splitter.git
   cd audiobook-splitter
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:** Navigate to your [localhost](http://localhost:3000)

## Contributing

Contributions are welcome, but keep in mind that this project is just a simple proof of concept, and that I'm not an expert in JavaScript. If you find within yourself an irresistible urge to contribute to this project, please feel free to submit a PR!

## Need help?

- Check the troubleshooting section in the app's sidebar
- Review the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp)
- Review the [ffmpeg documentation](https://ffmpeg.org/documentation.html)
- Open an issue in this repository

**Some common issues:**

- **Invalid URL errors:** Make sure you're using a complete YouTube URL. Shorts are not supported.
- **No output files:** Check that `yt-dlp` successfully downloaded the audio file
- **ffmpeg errors:** Ensure `ffmpeg` is properly installed and in your `PATH`
- **Filename issues:** The tool automatically sanitizes custom titles for safe filenames
- **Missing chapters:** Verify your timestamp format matches the supported examples
- **No sidebar on mobile:** The tool is designed for desktop use. *Do you really want to run a terminal on your mobile?*

## Stack

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) for downloading audio
- Uses [ffmpeg](https://ffmpeg.org/) for audio processing
- Uses vibes from [Claude](https://claude.ai/), especially for the regex used in the timestamp validation and parsing logic, and the URL/filename sanitization

## License

Copyright (c) <2025> `szekelyzol`

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

**Made with ❤️ for parents whose kids consume audiobooks way too fast.**
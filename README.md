# Audiobook Splitter

A simple web tool that helps you download audio from YouTube and split it into individual tracks based on timestamps. Perfect for creating chapter-based audiobooks that work with devices like Yoto players or any MP3-compatible device.

## 🎯 What it does

- Generates command-line instructions for downloading YouTube audio
- Splits audio files into separate tracks using timestamps
- Supports multiple timestamp formats (WEBVTT, simple timestamps)
- Creates organized output folders with properly named files
- Works entirely locally on your device (no uploads or cloud processing)

## ⚠️ Important Note

This tool **only generates commands** that you run locally on your device. It does not automatically download content from YouTube. Please ensure you only use it with content that is legally available for you to download.

## 🚀 Live Demo

Visit the live version: [https://your-username.github.io/audiobook-splitter](https://your-username.github.io/audiobook-splitter)

## 🛠️ Prerequisites

To use the generated commands, you need these tools installed:

### Required Tools
- **[yt-dlp](https://github.com/yt-dlp/yt-dlp)** - Downloads audio from YouTube
- **[ffmpeg](https://ffmpeg.org/)** - Splits audio into chapters

### Quick Installation

**Windows (WinGet):**
```bash
winget install -e --id yt-dlp.yt-dlp
winget install -e --id Gyan.FFmpeg
```

**macOS (Homebrew):**
```bash
brew install yt-dlp ffmpeg
```

**Manual Installation:**
- [yt-dlp installation guide](https://github.com/yt-dlp/yt-dlp/wiki/Installation)
- [ffmpeg downloads](https://ffmpeg.org/download.html)

## 📖 Usage

1. **Enter YouTube URL** - Paste any valid YouTube video URL
2. **Add Custom Title** (optional) - Provide a custom name for your files
3. **Add Timestamps** (optional) - Paste chapter timestamps from video description or comments
4. **Generate Commands** - Click the generate button to create command-line instructions
5. **Run Commands** - Copy and run the generated commands in your terminal

### Output Behavior

The tool behaves differently based on your inputs:

**📁 Single File Download (no timestamps):**
- **With custom title**: Creates `Your_Custom_Title.mp3`
- **Without custom title**: Creates `YouTube_Video_Title.mp3` (uses actual video title)

**📂 Split into Chapters (with timestamps):**
- **With custom title**: 
  - Audio file: `Your_Custom_Title.mp3`
  - Output folder: `Your_Custom_Title_20250118T143022`
  - Chapter files: `01_Chapter1.mp3`, `02_Chapter2.mp3`, etc.
- **Without custom title**:
  - Audio file: `full_audio.mp3`
  - Output folder: `output_20250118T143022`
  - Chapter files: `01_Chapter1.mp3`, `02_Chapter2.mp3`, etc.

### Supported Timestamp Formats

**WEBVTT Format:**
```
WEBVTT
00:00:00 --> 00:04:35
Chapter 1: Introduction
00:04:35 --> 00:09:21
Chapter 2: Main Content
```

**Simple Format:**
```
00:00 Introduction
04:35 Main Content
09:21 Conclusion
```

**Inverse Format:**
```
Introduction 00:00
Main Content 04:35
Conclusion 09:21
```

### Example Output

**Single file download (no timestamps):**

*With custom title "My Audiobook":*
```bash
yt-dlp -x --audio-format mp3 -o "My_Audiobook.%(ext)s" "https://youtube.com/watch?v=..."
```
*Result: `My_Audiobook.mp3`*

*Without custom title:*
```bash
yt-dlp -x --audio-format mp3 -o "%(title).100s.%(ext)s" "https://youtube.com/watch?v=..."
```
*Result: `Actual_YouTube_Video_Title.mp3`*

**Split into chapters (with timestamps):**

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

## 💻 Local Development

### Fork and Run Locally

1. **Fork this repository** on GitHub

2. **Clone your fork:**
   ```bash
   git clone https://github.com/YOUR-USERNAME/audiobook-splitter.git
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

5. **Open your browser:** Navigate to [http://localhost:3000](http://localhost:3000)

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run export       # Export static files for deployment
```

### Project Structure

```
src/
├── components/          # React components
│   ├── CommandOutput.tsx
│   ├── Sidebar.tsx
│   ├── StatusMessages.tsx
│   ├── TimestampInput.tsx
│   └── UrlInput.tsx
├── hooks/              # Custom React hooks
│   ├── useCommandGenerator.ts
│   ├── useDebounce.ts
│   └── useTimestampParser.ts
├── utils/              # Utility functions
│   ├── timestamp.ts
│   └── youtube.ts
├── types/              # TypeScript type definitions
├── constants/          # App constants
└── styles/             # CSS modules
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

### Development Guidelines

- Follow the existing code style
- Add TypeScript types for new functionality
- Update tests if applicable
- Update documentation for new features

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🐛 Troubleshooting

**Common Issues:**

- **Invalid URL errors:** Make sure you're using a complete YouTube URL
- **No output files:** Check that yt-dlp successfully downloaded the audio file
- **ffmpeg errors:** Ensure ffmpeg is properly installed and in your PATH
- **Filename issues:** The tool automatically sanitizes custom titles for safe filenames
- **Missing chapters:** Verify your timestamp format matches the supported examples

**Need Help?**

- Check the troubleshooting section in the app's sidebar
- Review the [yt-dlp documentation](https://github.com/yt-dlp/yt-dlp)
- Review the [ffmpeg documentation](https://ffmpeg.org/documentation.html)
- Open an issue in this repository

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [React](https://reactjs.org/)
- Uses [yt-dlp](https://github.com/yt-dlp/yt-dlp) for YouTube downloading
- Uses [ffmpeg](https://ffmpeg.org/) for audio processing
- Inspired by the need to create audiobooks for Yoto players

---

**Made with ❤️ for parents whose kids consume audiobooks faster than they can buy them!**
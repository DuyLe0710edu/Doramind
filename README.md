# 🎵 Doramind Music App

<div align="center">
  <img src="https://raw.githubusercontent.com/DuyLe0710edu/Doramind/main/public/doramind-logo.png" alt="Doramind Logo" width="180" height="180">
  <h3>A modern YouTube Music clone with enhanced features</h3>
  
  ![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
  ![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
  ![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2015-black)
  ![Styled with Tailwind CSS](https://img.shields.io/badge/Styled%20with-Tailwind%20CSS-38B2AC)
</div>

<p align="center">
  <img src="https://i.imgur.com/IKhPBcY.gif" alt="Doramind Demo" width="100%">
</p>

## ✨ Features

- 🔍 **Advanced Search** - Find songs, artists, and albums with ease
- 🎧 **Seamless Playback** - Uninterrupted music streaming experience
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- 🌙 **Dark Mode** - Easy on the eyes, perfect for night listening
- 💾 **Local Caching** - Smart caching strategy to reduce API calls
- 🔄 **API Key Rotation** - Intelligent handling of API quota limits
- ❤️ **Save Favorites** - Like songs and create custom playlists
- 🎛️ **Music Categories** - Browse by mood, genre, and curated collections

## 🚀 Live Demo

Check out the live demo: [Doramind Music App](https://doramind-music.vercel.app)

## 🛠️ Technologies Used

- **Frontend Framework**: [Next.js 15](https://nextjs.org/)
- **UI Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **API Integration**: YouTube Data API v3
- **Icons & UI Components**: [Lucide React](https://lucide.dev/icons/)
- **Deployment**: [Vercel](https://vercel.com/)

## 🖥️ Screenshots

<div align="center">
  <div style="display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;">
    <img src="https://i.imgur.com/KJVoZBS.jpg" width="400" alt="Home Page">
    <img src="https://i.imgur.com/5jTKhC8.jpg" width="400" alt="Explore Page">
    <img src="https://i.imgur.com/L3HwXq5.jpg" width="400" alt="Player View">
    <img src="https://i.imgur.com/wIdGiGR.jpg" width="400" alt="Mobile View">
  </div>
</div>

## 📋 Getting Started

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn
- YouTube Data API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/DuyLe0710edu/Doramind.git
cd Doramind
```

2. Install dependencies
```bash
npm install
# or
yarn install
```

3. Create a `.env.local` file in the root directory and add your YouTube API keys:
```
YOUTUBE_API_KEY_1=your_first_api_key
YOUTUBE_API_KEY_2=your_second_api_key
YOUTUBE_API_KEY_3=your_third_api_key
NEXT_PUBLIC_YOUTUBE_API_KEY=your_legacy_api_key
```

4. Start the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📊 Architecture

The app follows a clean, component-based architecture:

```
├── app/                 # Next.js App Router
│   ├── components/      # Reusable UI components
│   ├── lib/             # Utility functions and API services
│   ├── (routes)/        # Page routes
│   └── ...
├── public/              # Static assets
├── styles/              # Global styles
└── ...
```

### Key Components:

- **MusicPlayer**: Core audio playback engine with YouTube integration
- **AlbumCard**: Displays song/album information with play controls
- **MusicStore**: Global state management for playback and user preferences

## 🔌 API Integration

The app uses the YouTube Data API for:

- Searching videos
- Fetching trending music
- Getting related videos
- Video playback via the YouTube iFrame API

The API implementation includes:

- Smart caching to reduce API calls
- Key rotation to maximize quota usage
- Error handling and fallback data

## 🧪 Key Challenges & Solutions

### Challenge 1: YouTube API Quota Limitations

**Solution**: Implemented a multi-tier approach:
- Multiple API key rotation system
- Aggressive caching strategy
- Fallback data for when quotas are exceeded

### Challenge 2: Video Playback Reliability

**Solution**: Enhanced error handling:
- Better initialization of YouTube iFrame API
- Automatic recovery from network errors
- User-friendly feedback on player issues

### Challenge 3: Responsive Design for Various Devices

**Solution**: Built fully responsive UI:
- Tailwind CSS for adaptive layout
- Custom mobile optimizations
- Touch-friendly controls

## 🔮 Future Enhancements

- User authentication and profiles
- Lyrics integration
- Audio visualizer
- Offline playback capabilities
- PWA support for mobile installation

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👏 Acknowledgements

- [Next.js](https://nextjs.org/) for the amazing React framework
- [Tailwind CSS](https://tailwindcss.com/) for the utility-first CSS framework
- [YouTube Data API](https://developers.google.com/youtube/v3) for the content
- All the great artists whose music is featured in the app

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/DuyLe0710edu">Duy Le</a></p>
  <p>
    <a href="https://github.com/DuyLe0710edu">
      <img src="https://img.shields.io/github/followers/DuyLe0710edu?label=Follow&style=social" alt="GitHub">
    </a>
  </p>
</div>

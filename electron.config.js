module.exports = {
  appId: "com.localtts.app",
  productName: "Local TTS Audiobook Converter",
  directories: {
    output: "dist/build"
  },
  files: [
    "dist/renderer/**/*",
    "src/main/**/*",
    "package.json"
  ],
  asar: true,
  win: {
    target: "nsis",
    icon: "public/icon.png"
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true
  },
  extraResources: [
    {
      from: "resources/openjtalk/",
      to: "openjtalk/",
      filter: ["**/*"]
    }
    // Placeholder for ffmpeg binary (will be wired in Phase 3)
    // {
    //   "from": "resources/ffmpeg/",
    //   "to": "ffmpeg/",
    //   "filter": ["*"]
    // }
  ]
};

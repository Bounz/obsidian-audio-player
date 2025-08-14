# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Obsidian plugin that provides an enhanced audio player for markdown files. The plugin enables background audio playback with waveform visualization, bookmarks, and chapter navigation functionality.

## Development Commands

### Build and Development
- `npm run dev` - Start development mode with esbuild watch mode
- `npm run build` - Build for production (includes TypeScript type checking)
- `npm run version` - Bump version and update manifest files

### TypeScript Checking
The build process includes TypeScript compilation with `tsc -noEmit -skipLibCheck` for type validation.

## Architecture

### Plugin Structure
- **main.ts**: Main plugin class that extends Obsidian's `Plugin`. Registers markdown code block processor for `audio-player` blocks and adds commands for audio control.
- **audioPlayerRenderer.ts**: Bridge between Obsidian's `MarkdownRenderChild` and Vue.js, handles the lifecycle of Vue components within Obsidian.
- **components/App.vue**: Main Vue component containing the audio player UI, waveform visualization, and bookmark management.

### Key Features Implementation
- **Single Global Audio Instance**: One `HTMLAudioElement` shared across all player instances in the vault
- **Waveform Visualization**: Audio files are processed using Web Audio API to generate waveform data, cached in localStorage
- **Bookmarks/Comments**: Parsed from markdown text using timestamp format `HH:MM:SS --- comment`, stored inline in the markdown file
- **Command Integration**: Plugin registers Obsidian commands for pause, resume, seek, and bookmark management

### Vue Integration
- Uses Vue 3 with TypeScript
- Components are built with esbuild and `esbuild-plugin-vue3`
- Vue apps are mounted/unmounted as Obsidian renders/destroys markdown elements

### Audio File Processing
- Supports: mp3, wav, ogg, flac, mp4, m4a
- Waveform generation uses Web Audio API's `AudioContext.decodeAudioData()`
- Waveform data is cached per file path in localStorage for performance

### Markdown Processing
- Processes code blocks with `audio-player` language
- Extracts file paths from `[[filename]]` wiki-link format
- Parses bookmark timestamps from subsequent lines in format `HH:MM:SS --- comment`

## Development Notes

### File Structure
- `src/main.ts` - Plugin entry point and command registration
- `src/audioPlayerRenderer.ts` - Obsidian-Vue bridge
- `src/components/` - Vue components
- `src/types.ts` - TypeScript type definitions
- `src/utils.ts` - Time conversion utilities

### Build Configuration
- Uses esbuild for bundling with Vue plugin support
- External dependencies include Obsidian API and CodeMirror modules
- Development builds include inline source maps
- Production builds are optimized with tree shaking

### Event System
- Global events (`allpause`, `allresume`, `addcomment`) coordinate between multiple player instances
- Audio state synchronization ensures only one audio plays at a time

### Data Persistence
- Waveform data cached in localStorage by file path
- Bookmarks stored directly in markdown source files
- Plugin uses Obsidian's file system APIs for reading/writing
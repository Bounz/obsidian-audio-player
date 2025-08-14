# Technology Stack

## Core Technologies
- **TypeScript** - Primary language with strict null checks enabled
- **Vue 3** - Frontend framework for UI components with Composition API
- **Obsidian API** - Plugin development framework
- **Web Audio API** - Audio processing and waveform generation

## Build System
- **esbuild** - Fast bundler with Vue 3 plugin support
- **TypeScript Compiler** - Type checking (tsc -noEmit)
- **ESLint** - Code linting with TypeScript rules

## Development Dependencies
- Node.js 16+
- TypeScript 4.7.4
- Vue 3.2.41
- esbuild 0.14.47
- @typescript-eslint for linting

## Common Commands
```bash
# Development with watch mode
npm run dev

# Production build with type checking
npm run build

# Version bump (updates manifest.json and versions.json)
npm run version
```

## Code Style
- ESLint configuration with TypeScript recommended rules
- Unused variables are errors (except function args)
- Ban on TS comments is disabled
- Empty functions allowed
- ES6+ target with ESNext modules

// Skip TypeScript and just run Vite build
import { spawn } from 'child_process'; spawn('npx', ['vite', 'build'], { stdio: 'inherit' });

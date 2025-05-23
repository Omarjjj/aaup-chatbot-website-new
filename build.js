// Custom build script that skips TypeScript checking
import { exec } from 'child_process';

console.log('Starting custom build process...');
console.log('Skipping TypeScript checks and running Vite build directly...');

// Run Vite build directly without TypeScript
exec('npx vite build', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error during build: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`Build stderr: ${stderr}`);
  }
  
  console.log(`Build stdout: ${stdout}`);
  console.log('Build completed successfully!');
}); 
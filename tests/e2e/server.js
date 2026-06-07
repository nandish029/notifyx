import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Serve SDK files from root so /sw.js and /index.js work
app.use(express.static(path.join(__dirname, '../../dist')));

// Serve the test fixture
app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});

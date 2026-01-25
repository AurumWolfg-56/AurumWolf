import express from 'express';
import path from 'path';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';

// ESM path shim
const __filename = fileURLToPath(import.meta.url);
const currentDir = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
    contentSecurityPolicy: false // Simplify for now to avoid blocking local assets during test
}));
app.use(compression());
app.use(morgan('combined'));

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Static Files
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath));

// SPA Fallback
app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

// Start
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

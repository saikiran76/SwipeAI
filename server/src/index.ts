// server.js

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { processFile } from './documentProcessor.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.post('/api/process-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const fileType = req.file.mimetype;

    const result = await processFile(req.file.buffer, fileType);
    res.json(result);
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

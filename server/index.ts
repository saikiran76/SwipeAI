import express from 'express';
import type { Application, Request, Response, RequestHandler } from 'express';
import multer from 'multer';
import type { Multer as MulterType } from 'multer';
import cors from 'cors';
import { processDocument } from './src/services/documentProcessor';

// Define the request type with Multer's file
interface FileRequest extends Request {
  file?: Express.Multer.File;
}

const app: Application = express();
const upload: MulterType = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

const handlePdfUpload: RequestHandler = async (req: FileRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const result = await processDocument(req.file.buffer);
    res.json(result);
  } catch (error) {
    console.error('PDF processing error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to process PDF' 
    });
  }
};

app.post(
  '/api/process-pdf',
  upload.single('file'),
  handlePdfUpload
);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

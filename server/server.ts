import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import cors from 'cors';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG and WEBP are allowed.'));
    }
  }
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const PORT = 3000;

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ais-dev-pzn2t2wtipqows663l4ot6-426097546045.asia-southeast1.run.app' // Current dev URL
  ].filter(Boolean) as string[];

  console.log('Environment:', process.env.NODE_ENV);
  console.log('PORT:', PORT);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        // In production, you might want to be stricter, but origin: true is a good fallback
        callback(null, true); 
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));
  app.use((req, res, next) => {
    console.log(`[Express] ${req.method} ${req.url}`);
    next();
  });
  app.use(express.json());
  
  // Serve uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('[Socket] A user connected:', socket.id);

    socket.on('join-room', (room) => {
      if (!room) return;
      socket.join(room);
      console.log(`[Socket] User ${socket.id} joined room: ${room}`);
    });

    socket.on('join-staff', () => {
      socket.join('staff');
      console.log(`[Socket] User ${socket.id} joined staff room`);
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${socket.id} disconnected: ${reason}`);
    });
  });

  // Make io accessible to routes
  app.set('io', io);

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  const { menuRouter } = await import('./routes/menu.js');
  app.use('/api/menu', menuRouter);

  const { usersRouter } = await import('./routes/users.js');
  app.use('/api/users', usersRouter);
  app.use('/api/admin/users', usersRouter);

  const { adminRouter } = await import('./routes/admin.js');
  app.use('/api/admin', adminRouter);

  const { inventoryRouter } = await import('./routes/inventory.js');
  app.use('/api/inventory', inventoryRouter);

  const { authRouter } = await import('./routes/auth.js');
  app.use('/api/auth', authRouter);

  const { ordersRouter } = await import('./routes/orders.js');
  app.use('/api/orders', ordersRouter);

  // Image Upload Route
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // API 404 handler (Catch-all for unmatched /api routes)
  app.all('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production: Serve static files from dist
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

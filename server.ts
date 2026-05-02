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

  const PORT = process.env.PORT || 3000;

  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));
  app.use(express.json());
  
  // Serve uploads directory
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join-room', (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on('join-staff', () => {
      socket.join('staff');
      console.log(`User ${socket.id} joined staff room`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Make io accessible to routes
  app.set('io', io);

  // API Routes
  app.get('/api/health', async (req, res) => {
    let dbStatus = 'disconnected';
    try {
      const { prisma } = await import('./src/server/db.ts');
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch (e) {
      dbStatus = 'error';
    }
    res.json({ 
      status: 'ok', 
      database: dbStatus,
      timestamp: new Date().toISOString() 
    });
  });

  // Image Upload Route
  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // Dynamically import routes to avoid circular dependencies if they use prisma
  const { authRouter } = await import('./src/server/routes/auth.ts');
  const { menuRouter } = await import('./src/server/routes/menu.ts');
  const { orderRouter } = await import('./src/server/routes/orders.ts');
  const { inventoryRouter } = await import('./src/server/routes/inventory.ts');
  const { adminRouter } = await import('./src/server/routes/admin.ts');

  app.use('/api/auth', authRouter);
  app.use('/api/menu', menuRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/admin', adminRouter);

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

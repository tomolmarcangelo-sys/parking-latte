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
import jwt from 'jsonwebtoken';

// Routes
import { menuRouter } from './routes/menu.js';
import { usersRouter } from './routes/users.js';
import { adminRouter } from './routes/admin.js';
import { inventoryRouter } from './routes/inventory.js';
import { authRouter } from './routes/auth.js';
import { ordersRouter } from './routes/orders.js';
import { cartRouter } from './routes/cart.js';

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
  console.log('[Server] Starting initialization...');
  
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Socket.io Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as any;
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  const PORT = 3000;

  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:5173',
    'https://ais-dev-pzn2t2wtipqows663l4ot6-426097546045.asia-southeast1.run.app'
  ].filter(Boolean) as string[];

  console.log('[Server] Environment:', process.env.NODE_ENV);
  console.log('[Server] PORT:', PORT);

  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        callback(null, true); 
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  }));

  // Robust logging for all requests
  app.use((req, res, next) => {
    console.log(`[Express] [${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json());
  
  app.use('/uploads', express.static(path.join(process.cwd(), 'public/uploads')));

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    console.log(`[Socket] Authenticated user connected: ${user.id} (${user.role})`);
    
    // Join user's personal room
    socket.join(`user_${user.id}`);
    console.log(`[Socket] User ${user.id} joined personal room user_${user.id}`);

    // Join staff room if role is ADMIN or STAFF
    if (user.role === 'ADMIN' || user.role === 'STAFF') {
      socket.join('staff');
      console.log(`[Socket] User ${user.id} joined staff room`);
    }

    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${socket.id} disconnected: ${reason}`);
    });
  });

  app.set('io', io);

  // Health Check
  app.get('/api/health', (req, res) => {
    console.log('[API] Health check requested');
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      env: process.env.NODE_ENV
    });
  });

  // API Routes
  console.log('[Server] Registering API routes...');
  app.use('/api/menu', menuRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/admin/users', usersRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/inventory', inventoryRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/cart', cartRouter);

  app.post('/api/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  });

  // API 404 handler
  app.all('/api/*', (req, res) => {
    console.warn(`[API] 404 for ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite/Static Fallback
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Server] Initializing Vite middleware...');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    console.log('[Server] Serving production build...');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[Server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Critical failure during startup:', err);
});


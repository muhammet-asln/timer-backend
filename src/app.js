import express from 'express';
import { createServer } from 'http';
import "dotenv/config.js";
import { connectDB } from './config/db.js';
import authRouter from './routes/authRouter.js';
import studySessionRouter from './routes/studySessionRouter.js';
import cors from 'cors';
import models from './models/index.js';
import roomRouter from './routes/roomRouter.js';

import { initializeSocket } from './socket/socketHandler.js';
const app = express();
app.use(express.json());

await connectDB();

const httpServer = createServer(app);

app.use(cors({
  origin: '*',
}));
// Socket.io'yu başlat
const io = initializeSocket(httpServer);
app.set('io', io);

app.use('/api/auth', authRouter);
app.use('/api/sessions', studySessionRouter);
app.use('/api/rooms', roomRouter);


app.get('/', (req, res) => {
  
  res.send('Hello World!');
});

// httpServer'ı export et (server.js'de kullanmak için)
export { httpServer };
export default app;

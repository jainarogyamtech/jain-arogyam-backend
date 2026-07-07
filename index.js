import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import envt_imports from './envt_imports/envt_imports.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import usersRouter       from './routes/users.js';
import appointmentsRouter from './routes/appointments.js';
import finalizedRouter   from './routes/finalized.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5001;

// MongoDB connection
mongoose
  .connect(envt_imports.mongodbUri)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Middlewares
app.use(cors({ origin: ['http://localhost:5173', 'https://jap-fullstack.vercel.app' ]}));
app.use(express.json());

// Routes
app.get('/test', (req, res) => res.send('Backend is working!'));

app.use('/users',        usersRouter);
app.use('/appointments', appointmentsRouter);
app.use('/finalized',    finalizedRouter);

// deploy frontend and backend together-
app.use(express.static(path.join(__dirname, '../frontend/dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
});
// app.get('/{*path}', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/dist', 'index.html'));
// })

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

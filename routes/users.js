import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// GET /users — fetch all registered users (paginated, sorted by createdAt desc)
router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const users = await User.find()
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    res.json({ documents: users, total: await User.countDocuments() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/by-reg/:registrationNumber — find user by registration number
router.get('/by-reg/:registrationNumber', async (req, res) => {
  try {
    const user = await User.findOne({ RegistrationNumber: req.params.registrationNumber });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users — signup: duplicate check + registration number generation + create
router.post('/', async (req, res) => {
  try {
    const { FirstName, LastName, PatientEmail, MobileNumber, Gender, Date_Of_Birth } = req.body;

    const patientName = `${FirstName} ${LastName}`.trim();
    const uniqueCombination = `${FirstName}|${LastName}|${PatientEmail || 'null'}|${MobileNumber || 'null'}`;

    // Duplicate check
    const existing = await User.findOne({ UniqueCombination: uniqueCombination });
    if (existing) {
      return res.status(409).json({ error: 'User already exists with the same details.' });
    }

    // Generate next registration number
    const yearLastTwo = new Date().getFullYear().toString().slice(-2);
    const latest = await User.findOne().sort({ RegistrationNumber: -1 });
    const currentCount = latest
      ? parseInt(latest.RegistrationNumber.slice(-4), 10)
      : 0;
    const registrationNumber = `JAP${yearLastTwo}${String(currentCount + 1).padStart(4, '0')}`;

    const user = await User.create({
      FirstName,
      LastName,
      PatientName: patientName,
      PatientEmail: PatientEmail || null,
      MobileNumber: MobileNumber || null,
      Gender,
      RegistrationNumber: registrationNumber,
      Date_Of_Birth: Date_Of_Birth || null,
      UniqueCombination: uniqueCombination,
    });

    res.status(201).json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

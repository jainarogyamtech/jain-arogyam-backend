import express from 'express';
import FinalizedData from '../models/FinalizedData.js';
import Appointment from '../models/Appointment.js';
import { escapeRegex } from '../utils/regex.js';
import { endOfDayUTC } from '../utils/dateRange.js';

const router = express.Router();

const ALLOWED_SORT_KEYS = new Set([
  'RegistrationNumber', 'AppointmentDates', 'PatientName', 'PatientProblem',
  'DoctorAttended', 'TreatmentDone', 'PackagePurchased', 'RemainingSessions',
  'PaymentReceived', 'Payment', 'PaymentMode', 'Remarks',
]);

const buildMatch = ({ regNumber, name, startDate, endDate }) => {
  const match = {};

  if (regNumber) match.RegistrationNumber = { $regex: escapeRegex(regNumber), $options: 'i' };
  if (name) match.PatientName = { $regex: escapeRegex(name), $options: 'i' };

  if (startDate || endDate) {
    match.AppointmentDates = {};
    if (startDate) match.AppointmentDates.$gte = new Date(startDate);
    if (endDate) match.AppointmentDates.$lte = endOfDayUTC(endDate);
  }

  return match;
};

const buildSort = (sortKey, sortDir) => {
  const key = ALLOWED_SORT_KEYS.has(sortKey) ? sortKey : 'AppointmentDates';
  const dir = sortDir === 'asc' ? 1 : -1;
  return { [key]: dir, _id: 1 };
};

// GET /finalized — one page of historical records, filtered and sorted
// server-side so the client never has to hold the whole collection in memory.
router.get('/', async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 1), 200);
    const match = buildMatch(req.query);
    const sort = buildSort(req.query.sortKey, req.query.sortDir);

    const [documents, total] = await Promise.all([
      FinalizedData.find(match).sort(sort).skip((page - 1) * limit).limit(limit),
      FinalizedData.countDocuments(match),
    ]);

    res.json({ documents, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /finalized/export — every record matching the current filters,
// unpaginated, for the "Download Data" CSV button.
router.get('/export', async (req, res) => {
  try {
    const match = buildMatch(req.query);
    const sort = buildSort(req.query.sortKey, req.query.sortDir);

    const documents = await FinalizedData.find(match).sort(sort);

    res.json({ documents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /finalized — upsert finalized record AND delete active appointment
// Body: { appointmentId, ...patientData }
router.post('/', async (req, res) => {
  try {
    const { appointmentId, AppointmentDate, ...rest } = req.body;

    const dataToInsert = {
      ...rest,
      AppointmentDates: AppointmentDate || null,
    };

    // Upsert by RegistrationNumber
    const record = await FinalizedData.findOneAndUpdate(
      { RegistrationNumber: dataToInsert.RegistrationNumber },
      dataToInsert,
      { new: true, upsert: true }
    );

    // Delete active appointment
    if (appointmentId) {
      await Appointment.findByIdAndDelete(appointmentId);
    }

    res.status(201).json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

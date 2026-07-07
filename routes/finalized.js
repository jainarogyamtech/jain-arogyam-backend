import express from 'express';
import FinalizedData from '../models/FinalizedData.js';
import Appointment from '../models/Appointment.js';

const router = express.Router();

// GET /finalized — fetch historical data with optional filters
router.get('/', async (req, res) => {
  try {
    const { regNumber, name, startDate, endDate } = req.query;
    const query = {};

    if (regNumber) query.RegistrationNumber = regNumber;
    if (startDate && endDate) {
      query.AppointmentDates = {
        $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
      };
    }

    let records = await FinalizedData.find(query).sort({ AppointmentDates: -1 });

    if (name) {
      const lower = name.toLowerCase();
      records = records.filter((r) => r.PatientName.toLowerCase().includes(lower));
    }

    res.json({ documents: records });
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

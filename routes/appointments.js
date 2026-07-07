import express from 'express';
import Appointment from '../models/Appointment.js';

const router = express.Router();

// GET /appointments — fetch all active appointments with optional filters
router.get('/', async (req, res) => {
  try {
    const { regNumber, name, dateFrom, dateTo } = req.query;
    const query = {};

    if (regNumber) query.RegistrationNumber = regNumber;
    if (dateFrom && dateTo) {
      query.AppointmentDate = {
        $gte: new Date(dateFrom),
        $lte: new Date(new Date(dateTo).setHours(23, 59, 59, 999)),
      };
    }

    let appointments = await Appointment.find(query).sort({ AppointmentDate: -1 });

    // Name filter applied in JS (case-insensitive partial match)
    if (name) {
      const lower = name.toLowerCase();
      appointments = appointments.filter((a) =>
        a.PatientName.toLowerCase().includes(lower)
      );
    }

    res.json({ documents: appointments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /appointments/upsert — create or update by RegistrationNumber
router.post('/upsert', async (req, res) => {
  try {
    const data = req.body;
    const existing = await Appointment.findOne({ RegistrationNumber: data.RegistrationNumber });

    let appointment;
    if (existing) {
      appointment = await Appointment.findByIdAndUpdate(existing._id, data, { new: true });
    } else {
      appointment = await Appointment.create(data);
    }

    res.status(201).json(appointment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /appointments/:id — update a specific appointment
router.put('/:id', async (req, res) => {
  try {
    const {
      _id, __v, createdAt, updatedAt,
      // strip any leftover Appwrite fields if they arrive
      $id, $databaseId, $collectionId, $permissions, $createdAt, $updatedAt,
      ...dataToUpdate
    } = req.body;

    if ('PackagePurchased' in dataToUpdate) dataToUpdate.PackagePurchased = Boolean(dataToUpdate.PackagePurchased);
    if ('PaymentReceived' in dataToUpdate) dataToUpdate.PaymentReceived = Boolean(dataToUpdate.PaymentReceived);
    if ('RemainingSessions' in dataToUpdate) dataToUpdate.RemainingSessions = Number(dataToUpdate.RemainingSessions) || 0;
    if ('Payment' in dataToUpdate) dataToUpdate.Payment = Number(dataToUpdate.Payment) || 0;

    const updated = await Appointment.findByIdAndUpdate(req.params.id, dataToUpdate, { new: true });
    if (!updated) return res.status(404).json({ error: 'Appointment not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /appointments/:id — delete a specific appointment
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Appointment.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Appointment not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
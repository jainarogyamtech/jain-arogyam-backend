import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    RegistrationNumber: { type: String, required: true },
    PatientName:        { type: String, default: '' },
    PatientProblem:     { type: String, default: '' },
    AppointmentDate:    { type: Date, default: null },
    DoctorAttended:     { type: String, default: '' },
    TreatmentDone:      { type: String, default: '' },
    PackagePurchased:   { type: Boolean, default: false },
    PaymentReceived:    { type: Boolean, default: false },
    Payment:            { type: Number, default: 0 },
    PaymentMode:        { type: String, default: '' },
    RemainingSessions:  { type: Number, default: 0 },
    Remarks:            { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Appointment', appointmentSchema);
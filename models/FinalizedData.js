import mongoose from 'mongoose';

const finalizedDataSchema = new mongoose.Schema(
  {
    RegistrationNumber: { type: String, required: true, unique: true },
    PatientName:        { type: String, default: '' },
    PatientProblem:     { type: String, default: '' },
    AppointmentDates:   { type: Date, default: null },
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

export default mongoose.model('FinalizedData', finalizedDataSchema);

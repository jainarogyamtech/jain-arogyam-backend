import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    FirstName:          { type: String, required: true },
    LastName:           { type: String, required: true },
    PatientName:        { type: String, required: true },
    PatientEmail:       { type: String, default: null },
    MobileNumber:       { type: String, default: null },
    Gender:             { type: String, required: true },
    RegistrationNumber: { type: String, required: true, unique: true },
    Date_Of_Birth:      { type: String, default: null },
    UniqueCombination:  { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

export default mongoose.model('User', userSchema);
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    user_id: { type: String, default: null },
    email: { type: String, unique: true, required: true },
    name: { type: String, default: '' },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    business_groups: { type: [String], default: [] },
    businesses: { type: [String], default: [] },
  },
  { timestamps: true }
);

export default mongoose.model('User', UserSchema);

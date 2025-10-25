// server/src/models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    name: { type: String, trim: true },
    email: { type: String, unique: true, required: true, lowercase: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['editor', 'client'], default: 'editor' }
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);

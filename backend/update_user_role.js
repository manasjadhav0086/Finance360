import 'dotenv/config';
import mongoose from 'mongoose';
import User from './models/User.js';

async function updateUserRole() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('Error: MONGO_URI is not defined in .env');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB successfully.\n');

    const targetEmail = (process.argv[2] || 'sri12@mailinator.com').trim().toLowerCase();
    console.log(`Setting role to 'admin' for: ${targetEmail}`);

    const user = await User.findOneAndUpdate(
      { email: { $regex: new RegExp(`^${targetEmail}$`, 'i') } },
      {
        $set: {
          email: targetEmail,
          role: 'admin'
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log('\nUser updated/created successfully:');
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.name || '(none)'}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Business Groups: ${JSON.stringify(user.business_groups || [])}`);
    console.log(`- Businesses: ${JSON.stringify(user.businesses || [])}`);

    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB. Done!');
  } catch (err) {
    console.error('Error updating user role:', err);
    process.exit(1);
  }
}

updateUserRole();

import 'dotenv/config';
import User from './models/User.js';
import mysqlService from './utils/mysqlClient.js';

async function updateUserRole() {
  try {
    const targetEmail = (process.argv[2] || process.env.ADMIN_EMAIL || 'admin@misar.io').trim().toLowerCase();
    console.log(`Setting role to 'admin' for: ${targetEmail}`);

    const user = await User.findOneAndUpdate(
      { email: targetEmail },
      {
        email: targetEmail,
        role: 'admin',
        name: 'Administrator'
      },
      { upsert: true }
    );

    console.log('\nUser updated/created successfully in MySQL:');
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Name: ${user.name || '(none)'}`);
    console.log(`- Role: ${user.role}`);
    console.log(`- Business Groups: ${JSON.stringify(user.business_groups || [])}`);
    console.log(`- Businesses: ${JSON.stringify(user.businesses || [])}`);

    await mysqlService.close();
    console.log('\nDone!');
  } catch (err) {
    console.error('Error updating user role:', err);
    await mysqlService.close();
    process.exit(1);
  }
}

updateUserRole();

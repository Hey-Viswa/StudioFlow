// server/src/controllers/clerkWebhookController.js
import { Webhook } from 'svix';
import User from '../models/User.js';

/**
 * Handle Clerk webhook events
 * Events: user.created, user.updated, user.deleted
 */
export const handleClerkWebhook = async (req, res) => {
  try {
    // Get Svix headers for verification
    const svix_id = req.headers['svix-id'];
    const svix_timestamp = req.headers['svix-timestamp'];
    const svix_signature = req.headers['svix-signature'];

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      return res.status(400).json({ error: 'Missing svix headers' });
    }

    // Get the webhook secret from environment
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CLERK_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    // Create Svix instance with secret
    const wh = new Webhook(webhookSecret);

    let evt;
    try {
      // Verify the webhook signature
      evt = wh.verify(JSON.stringify(req.body), {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      });
    } catch (err) {
      console.error('Error verifying webhook:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Handle the webhook event
    const eventType = evt.type;
    console.log('Clerk webhook event:', eventType);

    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      
      default:
        console.log('Unhandled event type:', eventType);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Clerk webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

/**
 * Handle user.created event
 */
async function handleUserCreated(data) {
  try {
    const { id, email_addresses, first_name, last_name, image_url } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ clerkUserId: id });
    if (existingUser) {
      console.log('User already exists:', id);
      return;
    }

      // Create new user with free plan
    const user = await User.create({
      clerkUserId: id,
      email: email_addresses[0]?.email_address || '',
      name: `${first_name || ''} ${last_name || ''}`.trim(),
      profileImage: image_url || '',
      subscription: {
          plan: 'free',
        status: 'active'
      }
    });

    console.log('✅ User created via webhook:', user.email);
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Handle user.updated event
 */
async function handleUserUpdated(data) {
  try {
    const { id, email_addresses, first_name, last_name, image_url } = data;

    const user = await User.findOne({ clerkUserId: id });
    if (!user) {
      console.log('User not found, creating:', id);
      await handleUserCreated(data);
      return;
    }

    // Update user information
    user.email = email_addresses[0]?.email_address || user.email;
    user.name = `${first_name || ''} ${last_name || ''}`.trim() || user.name;
    user.profileImage = image_url || user.profileImage;
    
    await user.save();

    console.log('✅ User updated via webhook:', user.email);
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Handle user.deleted event
 */
async function handleUserDeleted(data) {
  try {
    const { id } = data;

    const user = await User.findOne({ clerkUserId: id });
    if (!user) {
      console.log('User not found for deletion:', id);
      return;
    }

    // Soft delete: Mark user as deleted but keep data for compliance
    user.deletedAt = new Date();
    await user.save();

    console.log('✅ User marked as deleted via webhook:', user.email);
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

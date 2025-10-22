const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

// Check if Google OAuth credentials are available
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
const callbackURL = `${process.env.SERVER_URL || 'http://localhost:5000'}/api/auth/google/callback`;

  console.log('🔧 OAuth Callback URL:', callbackURL);
  console.log('🔧 SERVER_URL env var:', process.env.SERVER_URL);
  
  // Configure Google OAuth strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL,
    scope: ['profile', 'email']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists
    let user = await User.findOne({ googleId: profile.id });
    
    if (user) {
      // Update user info if needed, but don't overwrite custom name changes
      user.email = profile.emails[0].value;
      // Only update photo if it's not a custom uploaded photo (base64)
      if (!user.photo || !user.photo.startsWith('data:image/')) {
        user.photo = profile.photos[0].value;
      }
      // Only update name if it's still the default Google display name
      if (user.name === profile.displayName) {
        user.name = profile.displayName;
      }
      await user.save();
      return done(null, user);
    }
    
    // Create new user
    user = new User({
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      photo: profile.photos[0].value,
      isActive: true
    });
    
    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Passport error:', error);
    return done(error, null);
  }
  }));
} else {
  console.log('⚠️  Google OAuth credentials not found. Google login will be disabled.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

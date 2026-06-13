const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  // 1. Get the token from the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verify the token using your Supabase JWT Secret
    const decoded = jwt.decode(token, {complete: true}); // Decode without verifying first to inspect the payload
    // const decoded = jwt.verify(token, process.env.SUPABASE_JWT_SECRET, { algorithms: ['HS256'] });
    // console.log('Decoded token:', decoded); // Debugging line to check the decoded token

    // 3. Map the Supabase token data to your req.user object
    // Supabase stores the User ID in 'sub' and custom fields in 'user_metadata'
    req.user = {
      userId: decoded.payload.sub, 
      email: decoded.payload.email,
      role: decoded.payload.user_metadata?.role || 'user',
      gender: decoded.payload.user_metadata?.gender || 'male',
      username: decoded.payload.user_metadata?.username || '',
    };

    next();
  } catch (error) {
    console.error('Token validation failed:', error.message);
    return res.status(401).json({ error: 'Token is invalid or expired' });
  }
};
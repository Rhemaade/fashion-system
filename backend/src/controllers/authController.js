const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase();
  return ['user', 'tailor'].includes(normalized) ? normalized : null;
}

function normalizeGender(gender) {
  const normalized = String(gender || '').trim().toLowerCase();
  return ['male', 'female'].includes(normalized) ? normalized : null;
}

function sanitizeOptionalGender(gender) {
  if (gender == null || gender === '') {
    return null;
  }

  return normalizeGender(gender);
}

function buildAuthPayload(user) {
  return {
    userId: user.id,
    username: user.username,
    role: user.role,
    gender: user.gender,
  };
}

function buildAuthResponse(user, token) {
  return {
    id: user.id,
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      gender: user.gender,
      defaultCustomerGender: user.default_customer_gender || null,
    },
  };
}

exports.syncUser = async (req, res) => {
  try {
    // req.user comes from the Supabase JWT authMiddleware we made earlier!
    // console.log('Syncing user with Supabase data:', req.user);
    const { userId, email, role, gender } = req.user;

    // We also need the username, which might be in the raw token
    // If not, we can default to the first part of their email
    const username = req.user.username || email.split('@')[0];

    const user = await prisma.user.upsert({
      where: { 
        email: email // Supabase uses UUIDs, so make sure your Prisma schema ID is a String/UUID
      },
      update: {
        // If they already exist, just update their latest info
        role: role,
        gender: gender,
      },
      create: {
        id: userId,
        username,
        email,
        role: role,
        gender: gender,
        default_customer_gender: role === 'tailor' ? normalizedGender : null,
      },
    });

    res.status(200).json({ message: 'User synced with database successfully', user });
  } catch (error) {
    console.error('Prisma Sync Error:', error);
    res.status(500).json({ error: 'Failed to sync user data' });
  }
};

exports.register = async (req, res) => {
  try {
    const { username, email, password, role, gender } = req.body;
    const normalizedRole = normalizeRole(role);
    const normalizedGender = normalizeGender(gender);

    if (!normalizedRole || !normalizedGender) {
      return res.status(400).json({ error: 'Role and gender are required.' });
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        password_hash,
        role: normalizedRole,
        gender: normalizedGender,
        default_customer_gender: normalizedRole === 'tailor' ? normalizedGender : null,
      },
    });

    const payload = buildAuthPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1d' });

    res.status(201).json(buildAuthResponse(user, token));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const payload = buildAuthPayload(user);
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '12h' });

    res.status(200).json(buildAuthResponse(user, token));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

exports.getCurrentUser = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        gender: true,
        default_customer_gender: true,
        created_at: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        gender: user.gender,
        defaultCustomerGender: user.default_customer_gender || null,
        createdAt: user.created_at,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error while fetching profile' });
  }
};

exports.updateCurrentUser = async (req, res) => {
  try {
    const { username, gender, defaultCustomerGender } = req.body;
    const currentUser = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        role: true,
      },
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const data = {};

    if (typeof username === 'string') {
      const trimmedUsername = username.trim();
      if (!trimmedUsername) {
        return res.status(400).json({ error: 'Username cannot be empty.' });
      }

      const existingUser = await prisma.user.findFirst({
        where: {
          username: trimmedUsername,
          NOT: { id: currentUser.id },
        },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists.' });
      }

      data.username = trimmedUsername;
    }

    if (gender !== undefined) {
      const normalizedGender = normalizeGender(gender);
      if (!normalizedGender) {
        return res.status(400).json({ error: 'A valid gender is required.' });
      }
      data.gender = normalizedGender;
    }

    if (defaultCustomerGender !== undefined) {
      if (currentUser.role !== 'tailor') {
        return res.status(400).json({ error: 'Only tailors can manage customer defaults.' });
      }

      const normalizedDefaultCustomerGender = sanitizeOptionalGender(defaultCustomerGender);
      if (defaultCustomerGender !== null && !normalizedDefaultCustomerGender) {
        return res.status(400).json({ error: 'A valid default customer gender is required.' });
      }

      data.default_customer_gender = normalizedDefaultCustomerGender;
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data,
    });

    return res.status(200).json({
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        gender: updatedUser.gender,
        defaultCustomerGender: updatedUser.default_customer_gender || null,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Server error while updating profile' });
  }
};

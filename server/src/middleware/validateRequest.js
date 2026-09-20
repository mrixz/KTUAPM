export const validateRegistration = (req, res, next) => {
  const { name, email, password, registerNumber, admissionYear, entryType } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  if (!registerNumber || registerNumber.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'KTU Register Number is required.' });
  }

  if (!admissionYear || isNaN(admissionYear)) {
    return res.status(400).json({ success: false, message: 'Valid admission year is required.' });
  }

  if (!entryType || !['regular', 'lateral'].includes(entryType.toLowerCase())) {
    return res.status(400).json({ success: false, message: 'Entry type must be regular or lateral.' });
  }

  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  next();
};

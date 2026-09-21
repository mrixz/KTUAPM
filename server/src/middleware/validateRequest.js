const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 2015;
const MAX_YEAR = CURRENT_YEAR + 2; // Allow near-future admissions

const PASSWORD_MIN = 8;
const PASSWORD_MAX = 128; // bcrypt silently truncates beyond 72 bytes; also prevents DoS via huge input

export const validateRegistration = (req, res, next) => {
  const { name, email, password, registerNumber, admissionYear, entryType } = req.body;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  if (!password) {
    return res.status(400).json({ success: false, message: 'Password is required.' });
  }
  if (password.length < PASSWORD_MIN) {
    return res.status(400).json({ success: false, message: `Password must be at least ${PASSWORD_MIN} characters.` });
  }
  if (password.length > PASSWORD_MAX) {
    return res.status(400).json({ success: false, message: `Password cannot exceed ${PASSWORD_MAX} characters.` });
  }

  if (!registerNumber || registerNumber.trim().length < 4) {
    return res.status(400).json({ success: false, message: 'KTU Register Number is required.' });
  }

  const year = parseInt(admissionYear, 10);
  if (!admissionYear || isNaN(year)) {
    return res.status(400).json({ success: false, message: 'Valid admission year is required.' });
  }
  if (year < MIN_YEAR || year > MAX_YEAR) {
    return res.status(400).json({ success: false, message: `Admission year must be between ${MIN_YEAR} and ${MAX_YEAR}.` });
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

export const validateChangePassword = (req, res, next) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ success: false, message: 'Current password is required.' });
  }

  if (!newPassword) {
    return res.status(400).json({ success: false, message: 'New password is required.' });
  }
  if (newPassword.length < PASSWORD_MIN) {
    return res.status(400).json({ success: false, message: `New password must be at least ${PASSWORD_MIN} characters.` });
  }
  if (newPassword.length > PASSWORD_MAX) {
    return res.status(400).json({ success: false, message: `New password cannot exceed ${PASSWORD_MAX} characters.` });
  }
  if (newPassword === currentPassword) {
    return res.status(400).json({ success: false, message: 'New password must be different from your current password.' });
  }
  if (confirmPassword !== newPassword) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  next();
};

export const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  next();
};

export const validateResetPassword = (req, res, next) => {
  const { password, confirmPassword } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, message: 'New password is required.' });
  }
  if (password.length < PASSWORD_MIN) {
    return res.status(400).json({ success: false, message: `Password must be at least ${PASSWORD_MIN} characters.` });
  }
  if (password.length > PASSWORD_MAX) {
    return res.status(400).json({ success: false, message: `Password cannot exceed ${PASSWORD_MAX} characters.` });
  }
  if (confirmPassword !== password) {
    return res.status(400).json({ success: false, message: 'Passwords do not match.' });
  }

  next();
};

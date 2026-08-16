const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const hashValue = async (value) => {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(value, salt);
};

const compareValue = async (value, hash) => {
  return await bcrypt.compare(value, hash);
};

const generateRandomToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

module.exports = {
  generateOTP,
  hashValue,
  compareValue,
  generateRandomToken
};

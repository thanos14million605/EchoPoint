import crypto from "crypto";

const generateOTP = () => {
  return { otp: crypto.randomInt(100000, 999999) };
};

export default generateOTP;

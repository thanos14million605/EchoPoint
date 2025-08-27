import bcrypt from "bcrypt";

const bcryptHash = async (data) => {
  return await bcrypt.hash(data, 12);
};

const bcryptCompare = async (candidate, actual) => {
  return await bcrypt.compare(candidate, actual);
};

export default { bcryptHash, bcryptCompare };

import dotenv from 'dotenv';
dotenv.config();

const envt_imports = {
  mongodbUri: process.env.MONGODB_URI,
  redisHost:  process.env.REDIS_HOST,
  redisPort:  process.env.REDIS_PORT,
};

export default envt_imports;

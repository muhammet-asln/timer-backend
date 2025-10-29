import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Check if DATABASE_URL is available
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

// .env dosyasından bağlantı cümlesini alarak yeni bir Sequelize instance oluştur
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  protocol: 'postgres',
});

// Veritabanı bağlantısını test etmek için bir fonksiyon
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL veritabanı bağlantısı başarılı.');
  } catch (error) {
    console.error('❌ Veritabanına bağlanılamadı:', error);
    process.exit(1);
  }
};

export { connectDB, sequelize };
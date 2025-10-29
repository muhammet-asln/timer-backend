import "dotenv/config.js";
import { httpServer } from './src/app.js'; // app yerine httpServer import ediyoruz

const PORT = process.env.PORT || 80; 

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Accessible on the network`);
  console.log(`📱 Ready for Flutter connections`);
});
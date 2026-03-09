import dotenv from 'dotenv';
import { sendWhatsAppMessage } from './src/lib/whatsapp.js'; // Ensure to use node resolution if needed, but tsx should handle it.
import fs from 'fs/promises';

dotenv.config({ path: '.env.local' });

async function run() {
  console.log("Sending WhatsApp Message...");
  const res = await sendWhatsAppMessage({ 
    to: '61423777006', 
    message: 'SELAMAT PAGII SAYANG SUDAH BISAAA WA KITAA!!!!' 
  });
  console.log("Response written to wa-output.json");
  await fs.writeFile('wa-output.json', JSON.stringify(res, null, 2));
}

run();

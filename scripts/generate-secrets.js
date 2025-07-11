#!/usr/bin/env node

// Script สำหรับ generate secure random strings

const crypto = require('crypto');

console.log('🔐 Generating secure secrets...\n');

// Generate JWT Secret
const jwtSecret = crypto.randomBytes(64).toString('hex');
console.log('JWT_SECRET:');
console.log(jwtSecret);
console.log('');

// Generate Webhook Verify Token
const webhookToken = crypto.randomBytes(32).toString('hex');
console.log('WEBHOOK_VERIFY_TOKEN:');
console.log(webhookToken);
console.log('');

console.log('✅ Copy ค่าด้านบนไปใส่ในไฟล์ .env');
console.log('⚠️  อย่าลืมเก็บค่าเหล่านี้ไว้อย่างปลอดภัย!');
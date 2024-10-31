# API-Project
## โครงสร้าง 
![image](https://github.com/user-attachments/assets/491e5b0e-9a88-4bf3-9c2f-18a318285cdb)


## Server.js
``` cpp
const express = require('express');

const bodyParser = require('body-parser');
const { Pool } = require('pg');
const authRoutes = require('./routes/auth');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 4000;

// ตั้งค่าการเชื่อมต่อ PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Middleware
app.use(bodyParser.json());
app.use('/api/auth', authRoutes(pool)); // ใช้ routes ของ auth

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
```

## Auth.js
``` cpp 
const ldap = require('ldapjs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const authRoutes = (pool) => {
  const router = require('express').Router();

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // เชื่อมต่อกับ LDAP
    const client = ldap.createClient({
      url: process.env.LDAP_URL,
    });

    client.bind(username, password, async (err) => {
      if (err) {
        return res.status(401).json({ error: 'Authentication failed' });
      }

      // หาก authentication สำเร็จ ให้เช็คในฐานข้อมูล PostgreSQL
      try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        
        if (result.rows.length > 0) {
          const user = result.rows[0];
          const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
          return res.json({ token });
        } else {
          return res.status(404).json({ error: 'User not found' });
        }
      } catch (error) {
        console.error('Error querying database:', error);
        res.status(500).json({ error: 'Internal server error' });
      } finally {
        client.unbind(); // ปิดการเชื่อมต่อ LDAP
      }
    });
  });

  return router;
};

module.exports = authRoutes;

```

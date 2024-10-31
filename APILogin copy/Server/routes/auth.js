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

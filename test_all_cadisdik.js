import axios from 'axios';

const VITE_API_URL = 'https://centralsimak.smakniscjr.sch.id/api';
const VITE_MANDALA_KEY = 'simak_mandala_fc9e4029674120d25bf08b59bf545ead2c02f2f73d7a461e';

async function run() {
  try {
    // 1. Login to get token
    console.log('Logging in...');
    const loginRes = await axios.post(`${VITE_API_URL}/mandala/auth/login`, {
      identifier: 'admin_mandala', // Let's check what username works
      password: 'password_mandala'
    }, {
      headers: { 'x-mandala-key': VITE_MANDALA_KEY }
    });
    
    const token = loginRes.data.token;
    console.log('Login successful! Token:', token);

    // 2. Fetch cadisdik list
    console.log('Fetching cadisdik...');
    const cadisdikRes = await axios.get(`${VITE_API_URL}/mandala/dapodik/cadisdik`, {
      headers: {
        'x-mandala-key': VITE_MANDALA_KEY,
        'Authorization': `Bearer ${token}`
      }
    });
    const cadisdiks = cadisdikRes.data.data || cadisdikRes.data || [];
    console.log(`Found ${cadisdiks.length} cadisdiks.`);

    // 3. Test each cadisdik_id with only x-mandala-key
    for (const item of cadisdiks) {
      const cid = item.cadisdik_id || item.id;
      const name = item.nama_instansi || item.nama;
      console.log(`\nTesting Cadisdik: ${name} (${cid})`);
      try {
        const testRes = await axios.get(`${VITE_API_URL}/mandala/kategori-keperluan`, {
          params: { cadisdik_id: cid },
          headers: { 'x-mandala-key': VITE_MANDALA_KEY }
        });
        console.log('-> SUCCESS! Data:', testRes.data);
      } catch (err) {
        console.log('-> Failed:', err.message, err.response?.status, err.response?.data?.message);
      }
    }
  } catch (err) {
    console.error('Error during run:', err.message, err.response?.status, err.response?.data);
  }
}
run();

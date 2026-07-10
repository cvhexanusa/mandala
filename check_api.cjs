const https = require('https');

const url = 'https://centralsimak.smakniscjr.sch.id/api/mandala/dapodik/peserta-didik?limit=10&page=1&status=non-aktif&sekolah_id=8f7c90fd-3517-46f7-98a7-56df1b5bf2c3';

const options = {
  headers: {
    'x-mandala-key': 'simak_mandala_fc9e4029674120d25bf08b59bf545ead2c02f2f73d7a461e',
    'Accept': 'application/json'
  }
};

https.get(url, options, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const j = JSON.parse(d);
      console.log('Status:', j.status);
      console.log('Total:', j.meta?.total_data || j.total);
      console.log('Data count:', j.data?.length);
      
      if (j.data && j.data.length > 0) {
        j.data.forEach((s, i) => {
          console.log('\n--- Student #' + i + ' ---');
          console.log('nama:', s.identitas?.nama);
          console.log('jenis_keluar_id (identitas):', s.identitas?.jenis_keluar_id);
          console.log('jenis_keluar_id_str (identitas):', s.identitas?.jenis_keluar_id_str);
          console.log('jenis_keluar_id (root):', s.jenis_keluar_id);
          console.log('jenis_keluar_id (akademik):', s.akademik?.jenis_keluar_id);
          console.log('tanggal_keluar (identitas):', s.identitas?.tanggal_keluar);
          console.log('tanggal_keluar (root):', s.tanggal_keluar);
          console.log('last_update (identitas):', s.identitas?.last_update);
          console.log('updated_at (root):', s.updated_at);
          console.log('semester_id (akademik):', s.akademik?.semester_id);
          console.log('semester_id (root):', s.semester_id);
          console.log('semester_id (identitas):', s.identitas?.semester_id);
          console.log('tingkat:', s.akademik?.tingkat);
          console.log('nama_rombel:', s.akademik?.nama_rombel);
          console.log('ROOT keys:', Object.keys(s));
          if (s.identitas) console.log('IDENTITAS keys:', Object.keys(s.identitas));
          if (s.akademik) console.log('AKADEMIK keys:', Object.keys(s.akademik));
        });
      } else {
        console.log('RAW response:', d.substring(0, 1000));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw:', d.substring(0, 1000));
    }
  });
}).on('error', e => console.log('Error:', e.message));

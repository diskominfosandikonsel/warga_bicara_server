const fs = require('fs');
const path = require('path');
const { connectDB } = require('../db/mongodb/connection');
const { getCollection } = require('../db/mongodb/controller');

async function generateExportFiles() {
  try {
    const db = await connectDB();
    const postCol = await getCollection('post');
    const userCol = await getCollection('users');
    const katCol = await getCollection('master_kategori_laporan');
    const subKatCol = await getCollection('master_kategori_laporan_sub');
    const unitCol = await getCollection('unit_kerja');
    const handleCol = await getCollection('post_handle');
    const tlCol = await getCollection('tindak_lanjut_laporan');
    const ketCol = await getCollection('post_keterangan');
    const lampCol = await getCollection('lampiran');

    const statusMap = {
      1: 'Menunggu Verifikasi',
      2: 'Delegasi ke OPD',
      3: 'Ditolak Admin Daerah',
      4: 'Dalam Proses / Tindak Lanjut OPD',
      5: 'Verified Masyarakat',
      6: 'Selesai / Tuntas',
      7: 'Penolakan Admin OPD'
    };

    const posts = await postCol.find().sort({ created_at: 1 }).toArray();
    const records = [];

    for (let i = 0; i < posts.length; i++) {
      const p = posts[i];
      const user = await userCol.findOne({ id: p.user_id });
      const kat = p.master_kategori_id ? await katCol.findOne({ id: p.master_kategori_id }) : null;
      const subKat = p.master_sub_kategori_id ? await subKatCol.findOne({ id: p.master_sub_kategori_id }) : null;
      
      const handles = await handleCol.find({ post_id: p.id }).toArray();
      const opdNames = [];
      for (const h of handles) {
        const u = await unitCol.findOne({ id: h.master_unit_kerja_id });
        if (u) opdNames.push(u.unit_kerja || u.nama || u.uraian);
        else opdNames.push(h.master_unit_kerja_id);
      }

      const lampiranPengaduan = await lampCol.find({ tabel_id: p.id, tabel: 'post' }).toArray();
      const tindakLanjutList = await tlCol.find({ post_id: p.id }).toArray();
      const riwayatKet = await ketCol.find({ post_id: p.id }).sort({ created_at: 1 }).toArray();

      const formatTgl = (d) => {
        if (!d) return '-';
        const date = new Date(d);
        if (isNaN(date.getTime())) return String(d);
        return date.toLocaleString('id-ID', { 
          timeZone: 'Asia/Makassar', 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit', 
          hour: '2-digit', 
          minute: '2-digit', 
          second: '2-digit' 
        });
      };

      records.push({
        no: i + 1,
        id_tiket: p.id,
        waktu_lapor: formatTgl(p.created_at),
        waktu_lapor_iso: p.created_at,
        judul: p.title || '-',
        uraian_aduan: p.body || '-',
        status_kode: p.status,
        status_teks: statusMap[p.status] || ('Status ' + p.status),
        nama_pelapor: user ? user.nama : '-',
        nik_pelapor: user ? (user.nik ? "'" + user.nik : '-') : '-',
        hp_pelapor: user ? (user.hp ? "'" + user.hp : '-') : '-',
        email_pelapor: user ? (user.email || '-') : '-',
        alamat_pelapor: user ? (user.alamat || '-') : '-',
        anonymous: p.anonymous ? 'Ya' : 'Tidak',
        kategori: kat ? kat.uraian : '-',
        sub_kategori: subKat ? subKat.uraian : '-',
        kecamatan: p.nama_kecamatan && p.nama_kecamatan !== '-' ? p.nama_kecamatan : '-',
        desa_kelurahan: p.nama_desa && p.nama_desa !== '-' ? p.nama_desa : '-',
        koordinat: (p.lat && p.lng) ? (p.lat + ', ' + p.lng) : '-',
        opd_penanggung_jawab: opdNames.join('; ') || 'Belum Didelegasikan',
        jumlah_lampiran_aduan: lampiranPengaduan.length,
        lampiran_aduan_files: lampiranPengaduan.map(l => l.file).join(', ') || '-',
        jumlah_tindak_lanjut: tindakLanjutList.length,
        uraian_tindak_lanjut: tindakLanjutList.map((tl) => `[${formatTgl(tl.created_at)}] ${tl.keterangan || '-'}`).join(' || ') || '-',
        waktu_selesai: p.status === 6 ? formatTgl(riwayatKet.filter(r => r.status === 6).pop()?.created_at || p.updated_at || '-') : '-',
        riwayat_log: riwayatKet.map(r => `[Status ${r.status}: ${statusMap[r.status] || ''} | ${formatTgl(r.created_at)}${r.keterangan ? ' | ' + r.keterangan : ''}]`).join(' -> ') || '-'
      });
    }

    // Export directory
    const exportDir = path.join(__dirname, '../export_bpk');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // 1. JSON Export
    fs.writeFileSync(path.join(exportDir, 'register_pengaduan_bpk.json'), JSON.stringify(records, null, 2), 'utf8');

    // 2. CSV Export (Excel Compatible)
    const headers = [
      'No',
      'ID Tiket / Register',
      'Waktu Pengaduan (WITA)',
      'Judul Pengaduan',
      'Uraian Pengaduan',
      'Status',
      'Nama Pelapor',
      'NIK Pelapor',
      'No HP Pelapor',
      'Email Pelapor',
      'Alamat Pelapor',
      'Anonim',
      'Kategori',
      'Sub Kategori',
      'Kecamatan',
      'Desa / Kelurahan',
      'Titik Koordinat',
      'OPD Penanggung Jawab',
      'Jumlah Lampiran Bukti',
      'File Lampiran',
      'Uraian Tindak Lanjut OPD',
      'Waktu Selesai',
      'Riwayat Log Penanganan'
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ');
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel
    csvContent += headers.map(escapeCsv).join(',') + '\r\n';

    records.forEach(r => {
      const row = [
        r.no,
        r.id_tiket,
        r.waktu_lapor,
        r.judul,
        r.uraian_aduan,
        r.status_teks,
        r.nama_pelapor,
        r.nik_pelapor,
        r.hp_pelapor,
        r.email_pelapor,
        r.alamat_pelapor,
        r.anonymous,
        r.kategori,
        r.sub_kategori,
        r.kecamatan,
        r.desa_kelurahan,
        r.koordinat,
        r.opd_penanggung_jawab,
        r.jumlah_lampiran_aduan,
        r.lampiran_aduan_files,
        r.uraian_tindak_lanjut,
        r.waktu_selesai,
        r.riwayat_log
      ];
      csvContent += row.map(escapeCsv).join(',') + '\r\n';
    });

    fs.writeFileSync(path.join(exportDir, 'register_pengaduan_bpk.csv'), csvContent, 'utf8');

    // 3. HTML Printable Report
    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>REKAPITULASI PENGADUAN WARGA BICARA</title>
<style>
  @page { 
    size: portrait; 
    margin: 12mm 10mm 12mm 10mm; 
  }
  * { box-sizing: border-box; }
  body { 
    font-family: 'Segoe UI', Arial, sans-serif; 
    font-size: 9.5px; 
    color: #1e293b; 
    margin: 0; 
    padding: 10px; 
    background: #fff; 
    line-height: 1.35;
  }
  .sheet { max-width: 100%; margin: 0 auto; }
  .header-table { width: 100%; border-bottom: 2.5px double #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
  .header-table td { vertical-align: middle; }
  .title-cell { text-align: center; line-height: 1.3; }
  .title-cell h3 { margin: 0; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #334155; }
  .title-cell h2 { margin: 2px 0; font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
  .title-cell p { margin: 2px 0; font-size: 10px; color: #475569; }
  
  .badge-info-box { 
    display: flex; 
    justify-content: space-between; 
    margin-bottom: 12px; 
    background: #f8fafc; 
    padding: 8px 12px; 
    border-radius: 5px; 
    border-left: 3.5px solid #0284c7; 
    font-size: 9.5px; 
  }
  .stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; margin-bottom: 12px; }
  .stat-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 5px; padding: 6px 4px; text-align: center; }
  .stat-num { font-size: 15px; font-weight: 800; color: #0f172a; }
  .stat-label { font-size: 8px; color: #64748b; text-transform: uppercase; font-weight: 600; }

  table.data-table { width: 100%; border-collapse: collapse; margin-top: 6px; table-layout: fixed; }
  table.data-table th, table.data-table td { 
    border: 1px solid #cbd5e1; 
    padding: 5px 6px; 
    text-align: left; 
    vertical-align: top; 
    word-wrap: break-word;
  }
  table.data-table th { 
    background: #0f172a; 
    color: #ffffff; 
    font-size: 9px; 
    text-transform: uppercase; 
    letter-spacing: 0.3px; 
    text-align: center; 
  }
  table.data-table tr:nth-child(even) { background: #f8fafc; }
  table.data-table tr { page-break-inside: avoid; }

  .badge { display: inline-block; padding: 2px 5px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; text-align: center; }
  .badge-success { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
  .badge-warning { background: #fef9c3; color: #a16207; border: 1px solid #fde047; }
  .badge-primary { background: #e0f2fe; color: #0369a1; border: 1px solid #7dd3fc; }
  .badge-danger { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; border: 1px solid #d8b4fe; }

  .print-btn-bar { margin-bottom: 12px; text-align: right; }
  .btn-print { background: #0284c7; color: #fff; border: none; padding: 6px 14px; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; }
  .btn-print:hover { background: #0369a1; }
  
  .signature-table { width: 100%; margin-top: 25px; page-break-inside: avoid; font-size: 9.5px; }
  .signature-table td { width: 33.3%; text-align: center; vertical-align: top; }

  @media print {
    body { padding: 0; }
    .print-btn-bar { display: none; }
  }
</style>
</head>
<body>
<div class="sheet">
  <div class="print-btn-bar">
    <button class="btn-print" onclick="window.print()">🖨️ Cetak / Simpan sebagai PDF (A4 Portrait)</button>
  </div>

  <table class="header-table">
    <tr>
      <td class="title-cell">
        <h3>PEMERINTAH KABUPATEN KONAWE SELATAN</h3>
        <h2>DINAS KOMUNIKASI, INFORMATIKA DAN PERSANDIAN</h2>
        <p>Sistem Pengelolaan Pengaduan Pelayanan Publik Berbasis Android "Warga Bicara"</p>
        <p><strong>REKAPITULASI DATA PENGADUAN WARGA</strong></p>
      </td>
    </tr>
  </table>

  <div class="badge-info-box">
    <div>
      <strong>Instansi Pengelola:</strong> Dinas Komunikasi, Informatika dan Persandian Kab. Konawe Selatan<br>
      <strong>Sistem Sumber:</strong> Database MongoDB Server "Warga Bicara"
    </div>
    <div style="text-align: right;">
      <strong>Tanggal Cetak:</strong> ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Makassar', dateStyle: 'full', timeStyle: 'short' })} WITA<br>
      <strong>Total Aduan:</strong> ${records.length} Laporan Terdaftar
    </div>
  </div>

  <div class="stat-grid">
    <div class="stat-card">
      <div class="stat-num">${records.length}</div>
      <div class="stat-label">Total Masuk</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #15803d;">${records.filter(r => r.status_kode === 6).length}</div>
      <div class="stat-label">Selesai</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #7e22ce;">${records.filter(r => r.status_kode === 4).length}</div>
      <div class="stat-label">Tindak Lanjut</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #b91c1c;">${records.filter(r => r.status_kode === 3 || r.status_kode === 7).length}</div>
      <div class="stat-label">Ditolak</div>
    </div>
    <div class="stat-card">
      <div class="stat-num" style="color: #0369a1;">${records.filter(r => r.status_kode === 1 || r.status_kode === 2).length}</div>
      <div class="stat-label">Menunggu / Delegasi</div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px;">No</th>
        <th style="width: 120px;">No. Tiket & Pelapor</th>
        <th style="width: 175px;">Pengaduan & Lokasi</th>
        <th style="width: 110px;">OPD & Status</th>
        <th>Tindak Lanjut & Bukti Penyelesaian</th>
      </tr>
    </thead>
    <tbody>
      ${records.map(r => {
        let badgeClass = 'badge-primary';
        if (r.status_kode === 6) badgeClass = 'badge-success';
        else if (r.status_kode === 4) badgeClass = 'badge-purple';
        else if (r.status_kode === 3 || r.status_kode === 7) badgeClass = 'badge-danger';
        else if (r.status_kode === 1 || r.status_kode === 2) badgeClass = 'badge-warning';

        return `<tr>
          <td style="text-align: center; font-weight: bold;">${r.no}</td>
          <td>
            <strong style="color: #0284c7;">#${r.id_tiket}</strong><br>
            <span style="color: #64748b; font-size: 8.5px;">${r.waktu_lapor}</span><br>
            <hr style="margin: 3px 0; border: none; border-top: 1px dashed #cbd5e1;">
            <strong>${r.anonymous === 'Ya' ? `${r.nama_pelapor} (Anonim)` : r.nama_pelapor}</strong><br>
            ${r.nik_pelapor !== '-' ? `<span style="font-size: 8px; color: #475569;">NIK: ${r.nik_pelapor.replace("'", '')}</span><br>` : ''}
            ${r.hp_pelapor !== '-' ? `<span style="font-size: 8px; color: #475569;">HP: ${r.hp_pelapor.replace("'", '')}</span>` : ''}
          </td>
          <td>
            <strong style="color: #0f172a; font-size: 10px;">${r.judul}</strong><br>
            <span style="font-size: 8.5px; color: #0369a1; font-weight: 600;">${r.kategori}</span> 
            ${r.sub_kategori !== '-' ? `<span style="font-size: 8px; color: #64748b;">&raquo; ${r.sub_kategori}</span>` : ''}<br>
            <div style="margin: 3px 0; font-size: 9px; white-space: pre-wrap;">${r.uraian_aduan}</div>
            <div style="font-size: 8px; color: #475569; margin-top: 2px;">
              <strong>Lokasi:</strong> Ds. ${r.desa_kelurahan}, ${r.kecamatan}
            </div>
            ${r.lampiran_aduan_files !== '-' ? `<div style="font-size: 7.5px; color: #64748b; margin-top: 2px;"><strong>Foto Bukti (${r.jumlah_lampiran_aduan}):</strong> ${r.lampiran_aduan_files}</div>` : ''}
          </td>
          <td>
            <strong style="color: #1e293b; font-size: 9px;">${r.opd_penanggung_jawab}</strong><br>
            <div style="margin-top: 4px;">
              <span class="badge ${badgeClass}">${r.status_teks}</span>
            </div>
          </td>
          <td style="font-size: 8.5px;">
            ${r.uraian_tindak_lanjut !== '-' ? `<div style="line-height: 1.35;">${r.uraian_tindak_lanjut.replace(/ \|\| /g, '<br>')}</div>` : '<em style="color: #94a3b8;">Belum ada catatan tindak lanjut</em>'}
          </td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <table class="signature-table">
    <tr>
      <td>
        Mengetahui,<br>
        <strong>Kepala Dinas Kominfo dan Persandian<br>Kabupaten Konawe Selatan</strong>
        <br><br><br><br>
        <strong><u>............................................................</u></strong><br>
        NIP. .....................................................
      </td>
      <td></td>
      <td>
        Andoolo, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br>
        <strong>Admin Pengelola Aplikasi Warga Bicara</strong>
        <br><br><br><br>
        <strong><u>............................................................</u></strong><br>
        NIP. .....................................................
      </td>
    </tr>
  </table>
</div>
</body>
</html>`;

    fs.writeFileSync(path.join(exportDir, 'rekapitulasi_pengaduan_bpk.html'), htmlContent, 'utf8');

    console.log('EXPORT_SUCCESS');
    console.log('Saved to:', exportDir);
    process.exit(0);
  } catch (err) {
    console.error('EXPORT_ERROR:', err);
    process.exit(1);
  }
}

generateExportFiles();

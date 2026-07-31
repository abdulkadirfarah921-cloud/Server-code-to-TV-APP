import React, { useEffect, useState } from 'react';
import axios from 'axios';

const API = (localStorage.getItem('token') ? axios.create({ baseURL: 'http://localhost:5000/api', headers: { Authorization: 'Bearer ' + localStorage.getItem('token') } }) : axios.create({ baseURL: 'http://localhost:5000/api' }));

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [view, setView] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [users, setUsers] = useState([]);
  const [codes, setCodes] = useState([]);
  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({ activeUsers: 0, memoryMB: 0 });
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (token) { API.defaults.headers.common['Authorization'] = 'Bearer ' + token; localStorage.setItem('token', token); fetchAll(); }
  }, [token]);

  async function fetchAll() {
    try {
      const u = await API.get('/admin/users?limit=30'); setUsers(u.data.users || []);
      const c = await API.get('/admin/codes?limit=30'); setCodes(c.data.codes || []);
      const ch = await API.get('/admin/channels'); setChannels(ch.data.channels || []);
      const l = await API.get('/admin/logs'); setLogs(l.data.logs || []);
      const s = await API.get('/admin/stats/live'); setStats(s => ({ ...s, activeUsers: s.activeUsers || 0 }));
      const res = await API.get('/admin/stats/resources'); setStats(s => ({ ...s, memoryMB: res.data.memoryUsageMB || 0 }));
    } catch (e) { console.error('Fetch error', e); }
  }

  async function handleLogin(e) {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', loginForm);
      if (res.data.token) { setToken(res.data.token); setMsg('تم الدخول بنجاح — مرحباً بك في TITAN PANEL'); setLoginForm({ username: '', password: '' }); }
    } catch (e) { setMsg('فشل الدخول — تحقق من اسم المستخدم وكلمة المرور'); }
  }

  async function createUser() {
    const username = prompt('اسم المستخدم الجديد:');
    const password = prompt('كلمة المرور:');
    const days = prompt('عدد الأيام (افتراضي 30):') || 30;
    try { await API.post('/admin/users', { username, password, days: Number(days), device: 'TV-MOBIL-PC-OPENED' }); setMsg('تم إنشاء المستخدم'); fetchAll(); } catch (e) { setMsg('خطأ في الإنشاء'); }
  }

  async function generateCodes() {
    const count = Number(prompt('عدد الأكواد (حد أقصى 1000):') || 10);
    const days = Number(prompt('عدد الأيام (30/90/365):') || 30);
    try { await API.post('/admin/codes/batch', { count, days, type: days >= 365 ? 'YEAR' : days >= 90 ? '3MONTHS' : '1MONTH' }); setMsg('تم توليد الأكواد'); fetchAll(); } catch (e) { setMsg('خطأ في التوليد'); }
  }

  async function toggleUserBlock(id, blocked) {
    try { await API.put('/admin/users/' + id, { deviceBlocked: blocked }); setMsg('تم تحديث الحظر'); fetchAll(); } catch (e) { setMsg('خطأ'); }
  }

  async function deleteUser(id) {
    if (!confirm('تأكيد الحذف؟')) return;
    try { await API.delete('/admin/users/' + id); setMsg('تم الحذف'); fetchAll(); } catch (e) { setMsg('خطأ'); }
  }

  async function addChannel() {
    const name = prompt('اسم القناة:');
    const url = prompt('رابط القناة:');
    if (!name || !url) return;
    try { await API.post('/admin/channels', { name, url, free: true, sortOrder: 0, active: true }); setMsg('تم إضافة القناة'); fetchAll(); } catch (e) { setMsg('خطأ'); }
  }

  async function exportUsers() {
    window.open('http://localhost:5000/api/admin/users/export', '_blank');
    setMsg('جارٍ تصدير ملف Excel');
  }

  async function backupDB() {
    try { const res = await API.post('/admin/backup'); setMsg('نسخ احتياطي: ' + res.data.file); } catch (e) { setMsg('خطأ في النسخ'); }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-titanBlack via-titanDark to-[#0a0b12]" dir="rtl">
        <div className="glass rounded-3xl p-10 w-full max-w-md shadow-2xl shadow-red-900/20">
          <div className="text-center mb-6">
            <h1 className="font-tajawal text-5xl font-black tracking-tight mb-2"><span className="red-gradient-text">TITAN</span> <span className="text-white">PANEL</span></h1>
            <p className="text-titanMuted text-sm">نظام إدارة الاشتراكات الاحترافي — إدارة أكواد — تسيير السيرفر</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input className="w-full bg-titanBlack border border-titanBorder rounded-xl px-4 py-3 text-titanText focus:outline-none focus:border-titanRed transition" placeholder="اسم المستخدم" value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
            <input type="password" className="w-full bg-titanBlack border border-titanBorder rounded-xl px-4 py-3 text-titanText focus:outline-none focus:border-titanRed transition" placeholder="كلمة المرور" value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
            <button className="w-full bg-gradient-to-l from-titanRed to-[#6b181f] text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/30 hover:brightness-110 transition">دخول الأدمن</button>
          </form>
          {msg && <div className="mt-4 text-sm text-center text-titanRed">{msg}</div>}
          <div className="mt-6 pt-4 border-t border-titanBorder text-xs text-titanMuted text-center">أمان عالي | JWT + Bcrypt + Rate Limit | قاعدة بيانات مشفرة</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-titanBlack text-titanText font-cairo" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-titanBorder/60">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('dashboard')} className="font-tajawal text-2xl font-black tracking-tight"><span className="red-gradient-text">TITAN</span> <span className="text-white">PANEL</span></button>
            <span className="hidden md:inline-block px-2 py-0.5 rounded bg-titanRed/10 text-titanRed text-xs font-bold border border-titanRed/30">ONLINE</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('users')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${view==='users'?'bg-titanRed text-white shadow':'bg-titanSurface text-titanMuted hover:text-white'}`}>المستخدمين</button>
            <button onClick={() => setView('codes')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${view==='codes'?'bg-titanRed text-white shadow':'bg-titanSurface text-titanMuted hover:text-white'}`}>الأكواد</button>
            <button onClick={() => setView('content')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${view==='content'?'bg-titanRed text-white shadow':'bg-titanSurface text-titanMuted hover:text-white'}`}>المحتوى</button>
            <button onClick={() => setView('server')} className={`px-3 py-1.5 rounded-lg text-sm font-bold transition ${view==='server'?'bg-titanRed text-white shadow':'bg-titanSurface text-titanMuted hover:text-white'}`}>السيرفر</button>
            <button onClick={() => { localStorage.removeItem('token'); setToken(''); }} className="px-3 py-1.5 rounded-lg text-sm font-bold bg-titanSurface text-titanMuted hover:text-white hover:bg-titanBorder">تسجيل الخروج</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {msg && <div className="mb-4 p-3 rounded-xl bg-titanRed/10 border border-titanRed/30 text-titanRed text-sm font-bold">{msg}</div>}

        {/* DASHBOARD */}
        {view === 'dashboard' && (
          <div className="space-y-8">
            <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="glass rounded-2xl p-6 card-hover">
                <div className="text-titanMuted text-xs mb-1">مستخدمون متصلون الآن</div>
                <div className="text-4xl font-tajawal font-black red-gradient-text">{stats.activeUsers || 0}</div>
                <div className="text-xs text-titanMuted mt-2">آخر 5 دقائق</div>
              </div>
              <div className="glass rounded-2xl p-6 card-hover">
                <div className="text-titanMuted text-xs mb-1">إجمالي المستخدمين</div>
                <div className="text-4xl font-tajawal font-black text-white">{users.length}</div>
                <div className="text-xs text-titanMuted mt-2">نشطون ومبدؤون</div>
              </div>
              <div className="glass rounded-2xl p-6 card-hover">
                <div className="text-titanMuted text-xs mb-1">أكواد متاحة</div>
                <div className="text-4xl font-tajawal font-black text-white">{codes.filter(c => !c.used).length}</div>
                <div className="text-xs text-titanMuted mt-2">من أصل {codes.length}</div>
              </div>
              <div className="glass rounded-2xl p-6 card-hover">
                <div className="text-titanMuted text-xs mb-1">استهلاك الذاكرة</div>
                <div className="text-4xl font-tajawal font-black text-white">{stats.memoryMB || 0} <span className="text-lg text-titanMuted">MB</span></div>
                <div className="text-xs text-titanMuted mt-2">سيرفر TITAN PANEL</div>
              </div>
            </section>

            <section className="grid md:grid-cols-2 gap-6">
              <div className="glass rounded-2xl p-6">
                <h2 className="font-tajawal text-xl font-black mb-4">آخر العمليات (Log)</h2>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {logs.slice(0, 10).map((l, i) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-titanBlack/60 rounded-lg px-3 py-2 border border-titanBorder/40">
                      <span className="text-titanMuted">{l.action}</span>
                      <span className="text-titanText font-bold">{l.target || '-'}</span>
                      <span className="text-titanMuted">{l.timestamp ? new Date(l.timestamp).toLocaleString('ar-EG') : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass rounded-2xl p-6 flex flex-col gap-4">
                <h2 className="font-tajawal text-xl font-black">أدوات سريعة</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={createUser} className="bg-gradient-to-l from-titanRed to-[#6b181f] hover:brightness-110 text-white font-bold py-3 rounded-xl shadow-lg shadow-red-900/30">إنشاء مستخدم</button>
                  <button onClick={generateCodes} className="bg-titanSurface hover:bg-titanBorder text-white font-bold py-3 rounded-xl border border-titanBorder">توليد 1000 كود</button>
                  <button onClick={exportUsers} className="bg-titanSurface hover:bg-titanBorder text-white font-bold py-3 rounded-xl border border-titanBorder">تصدير Excel</button>
                  <button onClick={backupDB} className="bg-titanSurface hover:bg-titanBorder text-white font-bold py-3 rounded-xl border border-titanBorder">نسخ احتياطي</button>
                </div>
                <a href="#" onClick={e =>{e.preventDefault(); window.open('https://wa.me/905348724547','_blank');}} className="mt-2 text-center text-sm text-titanMuted hover:text-titanRed transition">تواصل دعم واتساب: +90 534 872 45 47</a>
              </div>
            </section>
          </div>
        )}

        {/* USERS */}
        {view === 'users' && (
          <div className="glass rounded-3xl p-6 overflow-x-auto">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <h2 className="font-tajawal text-2xl font-black">إدارة المستخدمين</h2>
              <input value={q} onChange={e => { setQ(e.target.value); setTimeout(fetchAll, 400); }} className="bg-titanBlack border border-titanBorder rounded-xl px-3 py-2 text-sm w-72 focus:outline-none focus:border-titanRed" placeholder="بحث باسم المستخدم..." />
              <button onClick={createUser} className="ml-auto bg-gradient-to-l from-titanRed to-[#6b181f] text-white font-bold px-4 py-2 rounded-xl shadow">+ إنشاء مستخدم جديد</button>
            </div>
            <table className="w-full text-sm">
              <thead className="text-titanMuted border-b border-titanBorder">
                <tr><th className="text-right py-2 px-2">اسم المستخدم</th><th className="py-2">الدور</th><th>الجهاز</th><th>الأيام</th><th>نشط؟</th><th>آخر دخول</th><th>حظر؟</th><th>أدوات</th></tr>
              </thead>
              <tbody>
                {users.filter(u => !q || u.username.includes(q)).map(u => (
                  <tr key={u._id} className="border-b border-titanBorder/40 hover:bg-titanSurface/40">
                    <td className="py-2 px-2 font-bold">{u.username}</td>
                    <td><span className={`px-2 py-0.5 rounded text-xs font-bold ${u.role==='ADMIN'?'bg-titanRed/20 text-titanRed':'bg-blue-900/30 text-blue-200'}`}>{u.role}</span></td>
                    <td className="text-xs text-titanMuted">{u.device}</td>
                    <td>{u.subscriptionDays}</td>
                    <td>{u.subscriptionActive ? 'نعم' : 'لا'}</td>
                    <td className="text-xs text-titanMuted">{u.lastLogin ? new Date(u.lastLogin).toLocaleString('ar-EG') : '-'}</td>
                    <td><button onClick={() => toggleUserBlock(u._id, !u.deviceBlocked)} className={`text-xs font-bold px-2 py-1 rounded ${u.deviceBlocked?'bg-titanRed text-white':'bg-titanSurface text-titanMuted hover:text-white'}`}>{u.deviceBlocked?'محروم':'حظر'}</button></td>
                    <td className="flex gap-2 py-2"><button onClick={() => { const d = Number(prompt('تمديد الأيام:') || 30); API.put('/admin/users/'+u._id,{days:d}).then(()=>{setMsg('تم التمديد');fetchAll();}) }} className="text-xs bg-blue-900/30 text-blue-200 px-2 py-1 rounded hover:bg-blue-800">تمديد</button><button onClick={() => deleteUser(u._id)} className="text-xs bg-red-900/30 text-red-300 px-2 py-1 rounded hover:bg-red-800">حذف</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* CODES */}
        {view === 'codes' && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6">
              <h2 className="font-tajawal text-2xl font-black mb-4">إدارة الأكواد</h2>
              <div className="flex gap-3 mb-4">
                <button onClick={generateCodes} className="bg-gradient-to-l from-titanRed to-[#6b181f] text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-900/30">توليد دفعة (1000 كود)</button>
              </div>
              <div className="grid md:grid-cols-3 gap-3 text-xs">
                <div className="bg-titanBlack/60 rounded-xl p-3 border border-titanBorder"><div className="font-bold text-titanRed">1 شهر</div><div>30 يوم — كود استخدام مرة واحدة</div></div>
                <div className="bg-titanBlack/60 rounded-xl p-3 border border-titanBorder"><div className="font-bold text-titanRed">3 شهور</div><div>90 يوم — كود استخدام مرة واحدة</div></div>
                <div className="bg-titanBlack/60 rounded-xl p-3 border border-titanBorder"><div className="font-bold text-titanRed">سنة</div><div>365 يوم — كود استخدام مرة واحدة</div></div>
              </div>
            </div>
            <div className="glass rounded-3xl p-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-titanMuted border-b border-titanBorder"><tr><th className="text-right py-2">الكود</th><th>الأيام</th><th>نوع</th><th>مستخدم؟</th><th>من استخدمه</th><th>تاريخ الاستخدام</th></tr></thead>
                <tbody>
                  {codes.map(c => (
                    <tr key={c._id} className="border-b border-titanBorder/40"><td className="font-mono text-titanRed font-bold py-2">{c.code}</td><td>{c.days}</td><td>{c.type}</td><td>{c.used ? 'نعم' : 'لا'}</td><td>{c.usedBy ? c.usedBy.username || '-' : '-'}</td><td>{c.usedAt ? new Date(c.usedAt).toLocaleString('ar-EG') : '-'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {view === 'content' && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 flex items-center justify-between">
              <h2 className="font-tajawal text-2xl font-black">إدارة المحتوى — القنوات والإعلانات</h2>
              <button onClick={addChannel} className="bg-gradient-to-l from-titanRed to-[#6b181f] text-white font-bold px-4 py-2 rounded-xl">+ إضافة قناة مجانية</button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {channels.map(ch => (
                <div key={ch._id} className="glass rounded-2xl p-5 card-hover">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg">{ch.name}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${ch.free ? 'bg-green-900/30 text-green-300' : 'bg-amber-900/30 text-amber-300'}`}>{ch.free ? 'مجانية' : 'مدفوعة'}</span>
                  </div>
                  <div className="text-xs text-titanMuted mb-2 break-all">{ch.url}</div>
                  <div className="text-xs text-titanMuted mb-3">ترتيب: {ch.sortOrder} | نشط؟ {ch.active ? 'نعم' : 'لا'} | إعلانات؟ {ch.adsEnabled ? 'مفعل' : 'معطل'}</div>
                  <div className="flex gap-2">
                    <button onClick={() => API.put('/admin/channels/'+ch._id,{adsEnabled:!ch.adsEnabled}).then(()=>fetchAll())} className="text-xs bg-titanSurface hover:bg-titanBorder border border-titanBorder px-2 py-1 rounded">إعلانات</button>
                    <button onClick={() => API.delete('/admin/channels/'+ch._id).then(()=>fetchAll())} className="text-xs bg-red-900/30 text-red-200 hover:bg-red-800 px-2 py-1 rounded">حذف</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SERVER */}
        {view === 'server' && (
          <div className="space-y-6">
            <div className="glass rounded-3xl p-6 grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-tajawal text-xl font-black mb-3">إحصائيات السيرفر</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>متصل الآن</span><span className="font-bold text-titanRed">{stats.activeUsers}</span></div>
                  <div className="flex justify-between"><span>ذاكرة RSS</span><span className="font-bold">{stats.memoryMB} MB</span></div>
                  <div className="flex justify-between"><span>وقت التشغيل</span><span className="font-bold">{Math.round(process.uptime ? process.uptime() : 0)} ث</span></div>
                </div>
              </div>
              <div>
                <h3 className="font-tajawal text-xl font-black mb-3">سجل العمليات</h3>
                <div className="space-y-2 max-h-64 overflow-auto">
                  {logs.slice(0, 15).map((l, i) => (
                    <div key={i} className="text-xs bg-titanBlack/60 rounded p-2 border border-titanBorder/40"><div className="font-bold text-titanRed">{l.action}</div><div className="text-titanMuted">{l.details || ''}</div></div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-tajawal text-xl font-black mb-3">أدوات السيرفر</h3>
                <div className="flex flex-col gap-2">
                  <button onClick={() => API.post('/admin/server/restart').then(r => setMsg(r.data.message))} className="text-left bg-red-900/30 hover:bg-red-800 text-red-200 font-bold py-2 px-3 rounded-xl border border-red-900/40">إعادة تشغيل السيرفر</button>
                  <button onClick={backupDB} className="text-left bg-titanSurface hover:bg-titanBorder text-white font-bold py-2 px-3 rounded-xl border border-titanBorder">نسخ احتياطي تلقائي 24 ساعة</button>
                  <a href="#" onClick={e => { e.preventDefault(); window.open('https://wa.me/905348724547','_blank'); }} className="text-left text-sm text-titanMuted hover:text-titanRed transition">دعم واتساب +90 534 872 45 47</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

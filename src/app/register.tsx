import React, { useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { AuthButton, AuthError, AuthInput, AuthShell } from '../components/AuthUi';
import { AUTH_ERROR_VI, AuthError as AuthErrCode, isValidEmail } from '../game/auth';
import { activateCloudIdentity, cloudAvailable, registerLocal } from '../game/accounts';
import { audio } from '../game/audio';

export default function Register() {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function doRegister() {
    if (busy) return;
    audio.unlock(); audio.playSfx('click');
    setError(''); setNotice('');
    const name = displayName.trim();
    if (name.length < 2 || name.length > 16) { setError('Tên hiển thị cần từ 2 đến 16 ký tự.'); return; }
    if (!isValidEmail(email)) { setError(AUTH_ERROR_VI.EMAIL_INVALID); return; }
    if (password.length < 6) { setError(AUTH_ERROR_VI.PASSWORD_SHORT); return; }
    if (password !== confirm) { setError('Mật khẩu nhập lại chưa khớp.'); return; }
    setBusy(true);
    try {
      if (cloudAvailable()) {
        const { signUpCloud } = await import('../game/authCloud');
        const r = await signUpCloud(email, password, name);
        if (r.error) { setError(r.error); return; }
        if (r.needsConfirm) { setNotice('Đăng ký thành công! Hãy kiểm tra email để xác nhận tài khoản, sau đó quay lại màn hình Đăng nhập. (Nếu đã tắt "Confirm email" trong Supabase như hướng dẫn ở README thì đăng nhập được ngay.)'); return; }
        if (r.userId && r.profile) { await activateCloudIdentity(r.userId, r.profile, r.email); router.replace('/'); return; }
        setError('Đăng ký chưa hoàn tất, hãy thử đăng nhập.');
      } else {
        const r = await registerLocal({ email, password, displayName: name });
        if (r.error) { setError(AUTH_ERROR_VI[r.error as AuthErrCode] ?? 'Đăng ký thất bại.'); return; }
        router.replace('/');
      }
    } finally { setBusy(false); }
  }
  return (
    <AuthShell title="ĐĂNG KÝ" sub="Tạo tài khoản để lưu hồ sơ, hạng và lịch sử đấu. Tên hiển thị sẽ nhận mã tag #4 số — Riot ID của bạn (ví dụ: Tên#1234).">
      <AuthInput label="Tên hiển thị" value={displayName} onChangeText={setDisplayName} placeholder="2–16 ký tự" autoCapitalize="sentences" />
      <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="ban@vidu.com" />
      <AuthInput label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="Ít nhất 6 ký tự" secure />
      <AuthInput label="Nhập lại mật khẩu" value={confirm} onChangeText={setConfirm} placeholder="Nhập lại giống mật khẩu" secure />
      <AuthError text={error} />
      {!!notice && (<Text style={{ fontSize: 12.5, color: '#ffe9a8', lineHeight: 17, backgroundColor: 'rgba(201,162,39,0.15)', borderWidth: 1, borderColor: '#c9a227', borderRadius: 10, padding: 10 }}>{notice}</Text>)}
      <AuthButton title={busy ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'} onPress={doRegister} />
      <AuthButton title="Đã có tài khoản? Đăng nhập" ghost onPress={() => { audio.playSfx('click'); router.replace('/login'); }} />
    </AuthShell>
  );
}

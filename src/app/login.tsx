import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { router } from 'expo-router';
import { AuthButton, AuthError, AuthInput, AuthShell } from '../components/AuthUi';
import { AUTH_ERROR_VI, AuthError as AuthErrCode } from '../game/auth';
import { Identity, activateCloudIdentity, cloudAvailable, loginLocal, logout, restoreSession } from '../game/accounts';
import { audio } from '../game/audio';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [current, setCurrent] = useState<Identity | null>(null);
  useEffect(() => { restoreSession().then(idn => { if (idn.kind !== 'guest') setCurrent(idn); }); }, []);
  async function doLogin() {
    if (busy) return;
    audio.unlock(); audio.playSfx('click');
    setError(''); setBusy(true);
    try {
      if (cloudAvailable()) {
        const { signInCloud } = await import('../game/authCloud');
        const r = await signInCloud(email, password);
        if (r.error || !r.userId || !r.profile) { setError(r.error ?? 'Đăng nhập thất bại.'); return; }
        await activateCloudIdentity(r.userId, r.profile, r.email);
        router.replace('/');
      } else {
        const r = await loginLocal(email, password);
        if (r.error) { setError(AUTH_ERROR_VI[r.error as AuthErrCode] ?? 'Đăng nhập thất bại.'); return; }
        router.replace('/');
      }
    } finally { setBusy(false); }
  }
  async function playGuest() { audio.unlock(); audio.playSfx('click'); await logout(); router.replace('/'); }
  return (
    <AuthShell title="ĐĂNG NHẬP" sub={cloudAvailable() ? 'Đăng nhập tài khoản online (Supabase) để đồng bộ hồ sơ và hạng của bạn.' : 'Đăng nhập tài khoản trên thiết bị này. Kết nối Supabase để đồng bộ online (xem README).'}>
      {!!current && (
        <AuthError text={`Bạn đang đăng nhập với tư cách ${current.displayName}${current.tag ? '#' + current.tag : ''}. Hãy đăng xuất nếu muốn đổi tài khoản.`} />
      )}
      <AuthInput label="Email" value={email} onChangeText={setEmail} placeholder="ban@vidu.com" />
      <AuthInput label="Mật khẩu" value={password} onChangeText={setPassword} placeholder="••••••••" secure />
      <AuthError text={error} />
      <AuthButton title={busy ? 'Đang đăng nhập...' : 'Đăng nhập'} onPress={doLogin} />
      <AuthButton title="Chưa có tài khoản? Đăng ký" ghost onPress={() => { audio.playSfx('click'); router.push('/register'); }} />
      <AuthButton title="Chơi tiếp với tư cách khách" ghost onPress={playGuest} />
      <Text style={{ fontSize: 11, color: '#7f8bb0', textAlign: 'center', lineHeight: 15 }}>
        Khách vẫn chơi được mọi chế độ, nhưng không có hồ sơ đám mây và hạng chính thức.
      </Text>
    </AuthShell>
  );
}

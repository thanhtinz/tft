import { useLocalSearchParams } from 'expo-router';
import OnlineGameScreen from '../components/OnlineGameScreen';
export default function OnlineGameRoute() {
  const p = useLocalSearchParams<{ mode?: string; code?: string; name?: string }>();
  return <OnlineGameScreen mode={(p.mode === 'join' || p.mode === 'quick' ? p.mode : 'create')} joinCode={p.code ?? ''} playerName={p.name ?? 'Người chơi'} />;
}

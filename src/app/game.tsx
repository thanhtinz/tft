import { useLocalSearchParams } from 'expo-router';
import GameScreen, { GameMode } from '../components/GameScreen';
export default function GameRoute() { const p = useLocalSearchParams<{ mode?: string; stage?: string }>(); const mode = (p.mode === 'campaign' || p.mode === 'waves' || p.mode === 'tutorial' ? p.mode : 'arena') as GameMode; return <GameScreen mode={mode} stageId={Number(p.stage ?? 1)} />; }

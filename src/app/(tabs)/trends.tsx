import { PlaceholderScreen } from '@/components/PlaceholderScreen';
import { useTheme } from '@/theme';

export default function TrendsScreen() {
  const t = useTheme();
  return <PlaceholderScreen title="Trends" milestone="Milestone 5" emoji="📊" accent={t.candy.blue} />;
}

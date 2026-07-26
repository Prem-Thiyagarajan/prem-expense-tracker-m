import { Tabs } from 'expo-router';

import { TabBar } from '@/components/TabBar';
import { MonthProvider } from '@/state/MonthProvider';
import { MonthWarmer } from '@/state/MonthWarmer';

export default function TabsLayout() {
  return (
    <MonthProvider>
      {/* Sits outside the navigator so it keeps running while tabs are frozen —
          every tab's data for the selected month is cached before you reach it. */}
      <MonthWarmer />
      {/*
        Deliberately NOT using `freezeOnBlur` here. It does cut the cost of a
        month change — blurred tabs stop re-rendering — but a frozen screen also
        stops receiving the shared month, and doesn't reliably pick it up on
        unfreeze. The result was tabs disagreeing about which month they were
        showing, which is a far worse bug than a slow transition. Every tab
        reading one month (CONVENTIONS §8) is the guarantee that matters.
      */}
      <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="trends" />
        <Tabs.Screen name="expenses" />
        <Tabs.Screen name="budget" />
      </Tabs>
    </MonthProvider>
  );
}

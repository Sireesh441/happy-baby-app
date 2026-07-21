import Ionicons from '@expo/vector-icons/Ionicons';
import { Badge, Icon, Label, NativeTabs, VectorIcon } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useCart } from '@/context/cart-context';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'unspecified' ? 'light' : scheme];
  const { itemCount } = useCart();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon src={require('@/assets/images/tabIcons/home.png')} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cart">
        <Label>Cart</Label>
        <Icon src={<VectorIcon family={Ionicons} name="cart-outline" />} />
        {itemCount > 0 && <Badge>{String(itemCount)}</Badge>}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <Label>Account</Label>
        <Icon src={<VectorIcon family={Ionicons} name="person-outline" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

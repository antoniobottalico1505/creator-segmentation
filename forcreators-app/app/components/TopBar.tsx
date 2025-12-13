// app/components/TopBar.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';

type TopBarProps = {
  active?: string; // opzionale: per compatibilità con <TopBar active="pricing" />
};

const TopBar: React.FC<TopBarProps> = ({ active }) => {
  const router = useRouter();
  const pathname = usePathname();

  const navItems = [
    { label: 'Dashboard', path: '/' },
    { label: 'Pricing', path: '/pricing' },
    { label: 'Come funziona', path: '/come-funziona' },
    { label: 'Per brand', path: '/per-brand' },
    { label: 'FAQ', path: '/faq' },
    { label: 'Contatti', path: '/contatti' },
    { label: 'Privacy', path: '/privacy' },
  ];

  function go(path: string) {
    router.push(path as any);
  }

  function isActive(path: string) {
    // se passi active="pricing" ecc, lo usiamo
    if (active && typeof active === 'string') {
      const key = active.trim().toLowerCase();
      if (path === '/' && (key === 'dashboard' || key === 'home')) return true;
      if (path.replace('/', '') === key) return true;
    }

    // fallback: pathname reale
    if (path === '/' && (pathname === '/' || pathname === '/(tabs)')) {
      return true;
    }
    return pathname === path;
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.inner}>
        {/* LOGO + BRAND */}
        <View style={styles.brandRow}>
          <Image
            source={require('../../assets/ForCreators Image.png')}
            style={styles.logoImg}
          />

          <View style={styles.brandText}>
            <Text style={styles.brandName}>ForCreators</Text>
            <Text style={styles.brandSub}>
              Da profilo casual a top agency, con un solo strumento.
            </Text>
          </View>
        </View>

        {/* NAV + PILL */}
        <View style={styles.right}>
          <View style={styles.nav}>
            {navItems.map((item) => {
              const activeItem = isActive(item.path);
              return (
                <TouchableOpacity
                  key={item.path}
                  onPress={() => go(item.path)}
                  style={[styles.navItem, activeItem && styles.navItemActive]}
                >
                  <Text style={[styles.navText, activeItem && styles.navTextActive]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.topPill}>
            <View style={styles.topPillDot} />
            <Text style={styles.topPillText}>
              Pricing intelligence per social profile
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(148,163,184,0.3)',
    backgroundColor: 'rgba(245,247,251,0.9)',
    ...(Platform.OS === 'web'
      ? {
          position: 'sticky' as any,
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(12px)' as any,
        }
      : {}),
  },
  inner: {
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  // ✅ LOGO IMMAGINE (stessa dimensione/ombra del vecchio box)
  logoImg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    resizeMode: 'cover',
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  brandText: {
    flexDirection: 'column',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#4f46e5',
  },
  brandSub: {
    fontSize: 12,
    color: '#6b7280',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    flex: 1,
  },
  nav: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    maxWidth: '100%',
  },
  navItem: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  navItemActive: {
    backgroundColor: 'rgba(99,102,241,0.12)',
  },
  navText: {
    fontSize: 13,
    color: '#6b7280',
  },
  navTextActive: {
    color: '#4f46e5',
    fontWeight: '600',
  },
  topPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(99,102,241,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.18)',
  },
  topPillDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22c55e',
  },
  topPillText: {
    fontSize: 11,
    color: '#4f46e5',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
});

export default TopBar;

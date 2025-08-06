# PWA and Dark Mode Setup Guide

## Overview
This application has been configured with Progressive Web App (PWA) capabilities and a comprehensive dark mode system. This guide explains the setup and how to troubleshoot common issues.

## Dark Mode Features

### ✅ What's Working
- **Class-based dark mode** using Tailwind CSS
- **System preference detection** - automatically follows your OS theme
- **Manual toggle** - click the sun/moon icon in the header
- **Persistent storage** - remembers your preference
- **Smooth transitions** - all components support dark mode
- **Comprehensive coverage** - all UI components have dark mode variants

### 🔧 Configuration
- **Tailwind Config**: `darkMode: 'class'` enables class-based dark mode
- **Theme Context**: Manages theme state and persistence
- **CSS Variables**: Custom CSS variables for consistent theming
- **Meta Tags**: Dynamic theme color based on current mode

### 🎨 Dark Mode Classes Used
```css
/* Background colors */
dark:bg-gray-900
dark:bg-[#181f2a]

/* Text colors */
dark:text-white
dark:text-gray-400

/* Border colors */
dark:border-gray-800
dark:border-gray-700

/* Component-specific */
dark:bg-gray-800
dark:hover:bg-gray-700
```

## PWA Features

### ✅ What's Working
- **Service Worker Registration** - automatic caching and offline support
- **Web App Manifest** - proper app metadata and icons
- **Install Prompt** - "Install App" button appears when eligible
- **Offline Page** - custom offline experience
- **App Shortcuts** - quick access to dashboard and invoices
- **Theme-aware Icons** - different theme colors for light/dark modes

### 📱 PWA Requirements Met
- ✅ HTTPS (required for production)
- ✅ Web App Manifest
- ✅ Service Worker
- ✅ Responsive Design
- ✅ Installable (meets criteria)

### 🔧 PWA Configuration

#### Manifest.json
```json
{
  "name": "Project Invoice",
  "short_name": "InvoiceApp",
  "display": "standalone",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#2563eb",
  "background_color": "#ffffff"
}
```

#### Service Worker
- **Auto-registration** on app start
- **Cache strategies** for fonts and static assets
- **Offline fallback** to custom offline page
- **Update detection** with reload prompt

#### Install Prompt
- **Automatic detection** of install eligibility
- **User-friendly button** with download icon
- **Installation tracking** - hides button after install
- **Error handling** for failed installations

## Troubleshooting

### Dark Mode Issues

#### Problem: Dark mode not working
**Solution:**
1. Check browser console for errors
2. Verify Tailwind config has `darkMode: 'class'`
3. Ensure `dark` class is being added to `<html>` element
4. Check if CSS is properly loaded

#### Problem: Theme not persisting
**Solution:**
1. Check localStorage for 'theme' key
2. Verify ThemeContext is properly initialized
3. Check for localStorage errors in console

### PWA Issues

#### Problem: Install button not showing
**Possible Causes:**
1. **Already installed** - check if app is in standalone mode
2. **Not meeting criteria** - ensure HTTPS, manifest, and service worker
3. **Browser not supported** - check browser compatibility
4. **User dismissed** - prompt won't show again until criteria met

**Debug Steps:**
1. Open browser console and look for PWA debug info
2. Check if `beforeinstallprompt` event fires
3. Verify manifest.json is accessible at `/manifest.json`
4. Test on different browsers/devices

#### Problem: Service worker not registering
**Solution:**
1. Check console for registration errors
2. Verify `/sw.js` is accessible
3. Ensure HTTPS in production
4. Check browser service worker support

#### Problem: Offline functionality not working
**Solution:**
1. Verify service worker is active
2. Check workbox configuration
3. Test with network throttling
4. Verify offline.html exists

### Testing PWA

#### Development Testing
```bash
# Start development server
npm run dev

# Check PWA status in console
# Look for "PWA Debug Info" log
```

#### Production Testing
```bash
# Build the app
npm run build

# Serve with HTTPS (required for PWA)
npx serve -s dist --ssl-cert
```

#### Manual Testing Steps
1. **Install Test**: Look for install button in header
2. **Offline Test**: Disconnect network and refresh
3. **Update Test**: Deploy new version and check update prompt
4. **Standalone Test**: Install app and verify standalone mode

### Browser Support

#### PWA Support
- ✅ Chrome/Edge (Chromium-based)
- ✅ Firefox
- ✅ Safari (iOS 11.3+)
- ✅ Samsung Internet

#### Dark Mode Support
- ✅ All modern browsers
- ✅ System preference detection
- ✅ Manual toggle

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check PWA status (in browser console)
debugPWAStatus()
```

## File Structure

```
src/
├── contexts/
│   └── ThemeContext.tsx          # Dark mode management
├── lib/
│   └── pwa.ts                    # PWA utilities
├── components/
│   └── layout/
│       └── Header.tsx            # Theme toggle & install button
public/
├── manifest.json                 # PWA manifest
├── offline.html                  # Offline page
├── icon-192x192.png             # App icons
└── icon-512x512.png
```

## Common Issues & Solutions

### Issue: "Install App" button never appears
**Solution**: 
- Ensure you're on HTTPS (required for PWA)
- Check if app meets install criteria
- Try different browser/device
- Clear browser data and retry

### Issue: Dark mode flashes on page load
**Solution**:
- Theme is applied after React hydration
- This is normal behavior
- Consider adding a script tag to set theme before React loads

### Issue: PWA not updating
**Solution**:
- Service worker caches aggressively
- Check for update prompts
- Manually reload to force update
- Clear browser cache

## Performance Tips

1. **Optimize Images**: Use WebP format for better compression
2. **Minimize Bundle**: Tree-shake unused code
3. **Cache Strategy**: Use appropriate caching for different asset types
4. **Lazy Loading**: Implement code splitting for better performance

## Security Considerations

1. **HTTPS Required**: PWA features only work over HTTPS
2. **Content Security Policy**: Configure CSP for PWA
3. **Service Worker Scope**: Limit service worker scope appropriately
4. **Manifest Validation**: Ensure manifest.json is valid

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify all configuration files are correct
3. Test on different browsers/devices
4. Check network connectivity and HTTPS status
5. Review this troubleshooting guide 
# Mobile Authentication Troubleshooting Guide

## Issues and Solutions

### 1. **Network Connectivity Issues**

**Problem**: Authentication fails due to network problems in mobile environment.

**Solutions**:
- ✅ **Added network status monitoring** - The app now shows when you're offline
- ✅ **Better error messages** - Specific error messages for network failures
- ✅ **Network status indicator** - Yellow banner shows when offline
- ✅ **Debug info panel** - Tap the info button (bottom-right) to see network status

### 2. **Firebase Configuration Issues**

**Problem**: Firebase may not work properly in mobile apps due to domain restrictions.

**Solutions**:
- ✅ **Updated Capacitor config** - Added Firebase domains to allowed navigation
- ✅ **Better error handling** - Specific Firebase error messages
- ✅ **Fallback user creation** - Creates basic user profile if Firestore fails

### 3. **Common Authentication Errors**

| Error | Cause | Solution |
|-------|-------|----------|
| "No internet connection" | Network offline | Check WiFi/mobile data |
| "No account found" | Wrong email | Verify email address |
| "Incorrect password" | Wrong password | Reset password if needed |
| "Too many attempts" | Rate limiting | Wait 15 minutes |
| "Network error" | Firebase connectivity | Check internet connection |

### 4. **Testing Steps**

1. **Check Network Status**:
   - Look for yellow "No Internet Connection" banner
   - Tap the info button (bottom-right) to see debug info

2. **Test Authentication**:
   - Try creating a new account first
   - Use a simple email/password (e.g., test@example.com / password123)
   - Check for specific error messages

3. **Debug Information**:
   - Network: Should show "Online" when connected
   - Auth Loading: Should show "Ready" after initial load
   - User: Should show "Logged In" after successful authentication
   - Platform: Should show "Android" or "iOS"

### 5. **Firebase Console Setup**

Make sure your Firebase project is properly configured:

1. **Authentication**:
   - Go to Firebase Console → Authentication
   - Enable Email/Password authentication
   - Add your app's domain to authorized domains

2. **Firestore Database**:
   - Go to Firebase Console → Firestore Database
   - Create database if not exists
   - Set up security rules to allow authenticated users

3. **Project Settings**:
   - Verify your Firebase config in `src/config/firebase.ts`
   - Make sure API keys are correct

### 6. **Mobile-Specific Considerations**

**Android**:
- Check Android Studio console for errors
- Verify app has internet permissions
- Test on both emulator and physical device

**iOS**:
- Check Xcode console for errors
- Verify network permissions in Info.plist
- Test on both simulator and physical device

### 7. **Quick Fixes**

**If authentication still fails**:

1. **Clear app data**:
   - Uninstall and reinstall the app
   - Clear browser cache if testing in web

2. **Check Firebase rules**:
   ```javascript
   // Firestore security rules should allow authenticated users
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

3. **Test with simple credentials**:
   - Email: `test@example.com`
   - Password: `password123`

### 8. **Debug Tools Added**

- **Network Status Banner**: Shows when offline
- **Debug Info Panel**: Tap info button to see status
- **Better Error Messages**: Specific Firebase error codes
- **Loading States**: Visual feedback during authentication

### 9. **Next Steps**

1. Open Android Studio (should have opened automatically)
2. Build and run the app on an emulator or device
3. Test authentication with the debug tools
4. Check console logs for any errors
5. Use the debug info panel to monitor status

### 10. **Contact Support**

If issues persist:
1. Check the debug info panel for specific error codes
2. Note the network status and platform information
3. Try the authentication flow and note exact error messages
4. Check Android Studio/Xcode console for detailed logs

---

**Remember**: The app now has much better error handling and debugging tools. Use the debug info panel (info button) to monitor the authentication status and network connectivity. 
# Admin Email Validation Setup

This document explains how to set up and use the admin email validation system that restricts user registration to pre-authorized email addresses.

## Overview

The system now requires that users can only register if their email address exists in the `admins` collection in Firestore. This provides an additional layer of security and control over who can create accounts in the system.

## How It Works

1. **Registration Process**: When a user tries to register, the system checks if their email exists in the `admins` collection
2. **Email Validation**: If the email is not found or is inactive, registration is blocked
3. **Admin Management**: Existing admins can manage the list of authorized emails through the Admin Management interface

## Setup Instructions

### 1. Deploy Updated Firestore Rules

First, deploy the updated Firestore security rules that include the `admins` collection:

```bash
firebase deploy --only firestore:rules
```

### 2. Add Initial Admin Emails

Run the provided script to add initial admin emails to the database:

```bash
node add-initial-admins.js
```

This will add the following test emails:
- `admin@example.com`
- `manager@example.com`
- `test@example.com`

### 3. Customize Admin Emails

You can modify the `add-initial-admins.js` file to add your own authorized email addresses:

```javascript
const initialAdmins = [
  {
    email: 'your-email@yourcompany.com',
    displayName: 'Your Name',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    addedBy: 'system'
  },
  // Add more emails as needed
];
```

## Using the Admin Management Interface

### Accessing Admin Management

1. Log in as an admin user
2. Navigate to Settings
3. Click on the "Admin Management" tab

### Adding New Admin Emails

1. Click "Add Admin" button
2. Enter the full name and email address
3. Click "Add Admin" to save

### Managing Existing Admins

- **Activate/Deactivate**: Toggle admin status to enable/disable registration for that email
- **Delete**: Remove admin emails from the authorized list
- **Search**: Use the search function to find specific admins

## Database Structure

### Admins Collection

```javascript
{
  id: "auto-generated-id",
  email: "admin@example.com",
  displayName: "Admin Name",
  isActive: true,
  createdAt: Date,
  updatedAt: Date,
  addedBy: "user-id-who-added-this-admin"
}
```

### Security Rules

The `admins` collection has the following security rules:
- **Read**: Any authenticated user can read (for email validation during registration)
- **Write**: Only active admin users can create, update, or delete admin records

## User Registration Flow

1. User enters email on registration form
2. System validates email against `admins` collection
3. If email is found and active, registration proceeds
4. If email is not found or inactive, error message is shown
5. User cannot proceed with registration until authorized

## Error Messages

Users will see the following error messages:
- **Email not authorized**: "This email is not authorized to create an account. Please contact your administrator."
- **Email validation error**: Error message appears below the email field

## Best Practices

1. **Regular Review**: Periodically review the list of authorized admin emails
2. **Deactivate Instead of Delete**: Consider deactivating rather than deleting admin records to maintain audit trail
3. **Secure Access**: Ensure only trusted administrators have access to the Admin Management interface
4. **Email Verification**: Consider implementing email verification for added security

## Troubleshooting

### Common Issues

1. **Registration Blocked**: Ensure the email is added to the `admins` collection and marked as active
2. **Permission Denied**: Check that the user has admin privileges to access Admin Management
3. **Database Errors**: Verify Firestore rules are properly deployed

### Testing

To test the system:
1. Try registering with an unauthorized email - should be blocked
2. Add the email to the admin list
3. Try registering again - should succeed
4. Deactivate the admin email
5. Try registering - should be blocked again

## Security Considerations

- The `admins` collection is readable by all authenticated users (needed for registration validation)
- Only admin users can modify the `admins` collection
- Consider implementing additional security measures like IP restrictions or rate limiting
- Regular audit of authorized admin emails is recommended 